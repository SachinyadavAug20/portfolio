/*
 * catBrain — the cat's intelligence layer.
 *
 * Scales phrases from ~700 hand-written lines into a combinatorial space of
 * 100k+ unique messages via grammar-safe templates, plus contextual pools
 * (route, hour, scroll depth, session stats, typing tempo) and weighted
 * random "acts" the cat performs on its own.
 *
 * Rules of voice: lowercase, short, simple, smart. Occasional transliterated
 * Hindi (the Luna tour-guide persona). Glyphs only (no emoji).
 */

import { CAT_NAME, CHATTER, PET_LINES, THEME_LINES, WAKE_LINES, rand } from "./cat";
import type { CatContext } from "./catTypes";

export type { CatContext };

export const pick = <T,>(pool: readonly T[]): T => pool[rand(pool.length)];

/* ---------------------------- repeat guard ---------------------------- */

const seen: string[] = [];
const seenSet = new Set<string>();
const SEEN_MAX = 120;

const remember = (s: string) => {
  if (seenSet.has(s)) return;
  seen.push(s);
  seenSet.add(s);
  if (seen.length > SEEN_MAX) seenSet.delete(seen.shift() as string);
};

/** sample from a pool, avoiding recent repeats when possible */
export const freshPick = (pool: readonly string[]): string => {
  for (let i = 0; i < 14; i++) {
    const s = pick(pool);
    if (!seenSet.has(s)) {
      remember(s);
      return s;
    }
  }
  const fallback = pick(pool);
  remember(fallback);
  return fallback;
};

const build = (make: () => string): string => {
  for (let i = 0; i < 14; i++) {
    const s = make();
    if (!seenSet.has(s)) {
      remember(s);
      return s;
    }
  }
  const fallback = make();
  remember(fallback);
  return fallback;
};

/* ------------------------------- pools -------------------------------- */

const TOPICS = [
  "closures", "prototypes", "flexbox", "git rebase", "big-O", "websockets",
  "index bloat", "dark mode", "lighthouse scores", "type coercion",
  "race conditions", "memoization", "the og tag", "breadcrumbs", "lazy loading",
  "hero images", "vite manifests", "react keys", "docker layers", "sql joins",
  "regex", "css specificity", "aria labels", "core web vitals", "service workers",
  "webgl shaders", "scroll triggers", "parallax", "the favicon", "the sitemap",
  "robots.txt", "package-lock", "node_modules", "cache invalidation", "retries",
  "timeouts", "unit tests", "e2e tests", "flaky tests", "ci pipelines",
  "feature flags", "a/b tests", "cron jobs", "p95 latency", "database indexes",
  "migrations", "semver", "hotfixes", "squash merges", "code review",
  "standups", "roadmaps", "TODO comments", "FIXME leftovers", "console.logs",
  "stack traces", "error boundaries", "graceful degradation", "viewport units",
  "prefers-reduced-motion", "keyboard nav", "focus rings", "contrast ratios",
  "line height", "ligatures", "semicolons", "monorepos", "edge functions",
  "cdn caches", "jwt", "oauth", "rate limits", "cookies", "localstorage",
  "hydration", "ssr", "markdown", "mermaid diagrams", "wikilinks", "backlinks",
  "graph views", "daily notes", "zettelkasten", "obsidian vaults", "portfolio sites",
  "case studies", "bounce rate", "tree shaking", "dynamic imports", "code splitting",
  "typescript generics", "zod schemas", "webgl fog", "spring physics", "view transitions",
  "the scroll bar", "your tabs", "that one bug", "the deploy button",
  "his dotfiles", "the vault graph", "the send button", "his side projects",
  "night builds", "the games tab", "his commit history", "the graph view",
].map((s) => s);

const VERBS = [
  "judged", "napped on", "purr-tested", "wrote fake tests for",
  "gave a silent 5 stars to", "stress-tested with my paw", "renamed twice",
  "added a comment to", "removed a comment from", "chased in circles around",
  "audited", "compiled in my head", "snoozed beside", "side-eyed",
  "supervised", "refactored mentally", "gave the slow blink to", "sat on",
  "knocked off a desk (conceptually)", "wrote a unit test for (it passed, i cheated)",
  "forgave", "suspected", "outlined a redesign for", "napped next to",
  "gave the tail flick of approval to", "filed a bug for (the bug was a mouse)",
  "optimized", "commented out (in my dreams)", "reviewed at 2am (cats don't sleep)",
  "marginalia'd", "drew whisker diagrams for", "yeeted into staging (pretend)",
  "rubs against approvingly", "bunts", "claims as own", "declares victory over",
  "takes a victory nap after", "considers fine, actually", "will overlook",
  "quietly respects", "openly judges", "loves but won't admit", "predicted the bugs in",
  "wrote better docs for (a napkin)", "solved using recursion (in my head)",
  "measured in naps", "gave the bread-loaf of approval to", "circled thrice before approving",
].map((s) => s);

const TAILS = [
  "and i regret nothing.", "no notes.", "10/10 would nap again.", "twice.",
  "in production. trust.", "while you were tab-switching.", "(i was right, as usual).",
  "and now i'm hungry.", "without reading the docs.", "like a responsible adult. meow.",
  "then napped.", "and told nobody.", "the hard way.", "before you finished typing.",
  "on a cold boot.", "before breakfast.", "quietly, from a sunbeam.", "like it owed me rent.",
  "with my eyes closed. accuracy: 100%.", "and slept like a kitten after.",
  "using best practices (napping is a practice).", "at 3am. no context.",
  "while the build was green.", "before the tests even ran.", "with one paw.",
  "and promoted myself to manager.", "as one does.", "before anyone noticed.",
  "with unnecessary drama.", "and marked it wontfix (affectionate).",
  "on principle.", "during standup. nobody knew.", "like a senior engineer.",
  "without a standup.", "and blamed css.", "and css accepted it.", "with great purr.",
  "during the retrospective.", "as a treat.", "on the second attempt.", "legally.",
  "with consent of the mouse.", "while being extremely cute.", "in a follow-up PR.",
  "as the docs intended.", "on my terms.", "for the vibes.", "and shipped it Friday.",
  "with my tail.", "confidently.", "entirely alone.", "in one leap.",
  "like watching fireworks for cats.", "and stretched afterwards.", "as a warmup.",
  "with zero merge conflicts (i invented them).", "and took the long way home.",
  "big fan, no notes.", "and i'd do it again, slower, with more naps.",
  "pet-approved.", "sachin would be proud. i'm cautiously emotional.",
  "then told the yarn about it.", "with my whole heart and one paw.",
].map((s) => s);

const ADJ = [
  "judgmental", "orange", "already asleep", "slightly damp", "chaotic good",
  "extremely senior", "quietly luxurious", "a little feral", "chronically online",
  "softly glowing", "over-engineered", "beautifully lazy", "mildly cursed",
  "certified", "fully loafed", "aggressively fine", "professionally curious",
  "eight-limbed", "weatherproof", "surprisingly legal", "made of yarn",
  "90% whitespace", "mostly harmless", "taxed and tired", "on brand",
  "slightly haunted", "vaguely blue", "deep in the docs", "nap-optimized",
  "keyboard-approved", "unreasonably polished", "quiet as a build at midnight",
].map((s) => s);

const FACTS = [
  "cats spend ~70% of life sleeping. i spend 100% of portfolio time supervising.",
  "a cat's purr runs 25-150 Hz. your typing? louder.",
  "cats have 32 eyelid modes. i use 27 to judge your stack.",
  "the average cat runs 30 mph. my pages load in 96 ms. race is close.",
  "cats see better in low light than you. also in dark mode.",
  "one cat = 200 facial muscles. mostly used for smirking at bugs.",
  "cats drink water with their tongue backwards. i backport features the same way.",
  "a group of cats is a clowder. a group of tabs is a problem.",
  "cats knead to remember milk. i knead the keyboard to remember git.",
  "cat whiskers map tight spaces. my aria labels do the same for keyboards.",
  "cats rotate 180° to see behind them. i read error logs the same way.",
  "kittens learn to meow only for humans. i learned css only for you.",
  "cats ignore you on purpose. it's called batching.",
  "a cat's heart beats 140 bpm during play. mine during deploys.",
  "cats choose their humans. also their favorites in the codebase.",
  "declawed? never. i ship with weapons.", // careful voice — soften: keep? it's fine playful
  "cats blink slowly to say i love you. i do that after your build passes.",
  "a cat's jump = 5x its tail. a good abstraction = 5x fewer files.",
  "cats patrol the same route daily. i check every route on this site.",
  "the internet was made for cats. check the traffic data.",
  "cats dislike change. also, merge conflicts.",
  "cat brain = 90% nap plan, 10% world domination (and it shows).",
  "cats test gravity daily. i test staging.",
  "one in three homes owns a cat. the other two own a backlog.",
  "cats prefer fresh water. i prefer fresh commits.",
  "cats sleep 12-16 hours a day. i'm awake for every deploy you do.",
  "a cat never truly sleeps. neither does your ci pipeline.",
  "cats find the one warm spot. also the one bug.",
  "kneading = contentment. purring = approval. slow blink = merge.",
  "cats track movement, not words. i track your cursor.",
  "cat memory: 16 hours for faces. mine: forever for console.logs.",
  "whiskers forward = curiosity. whiskers back = css specificity debate.",
  "cats bring gifts. usually dead. like legacy code.",
  "the humble cat has 230 bones. your stack? more config.",
  "cats see blue-yellow, not red-green. your design system: still fine.",
  "cats groom when nervous. i groom the codebase comments.",
  "no two cats sit alike. no two browsers render alike.",
  "cats drink for ~30 s straight. my attention on your scroll: about that.",
  "cats favor their left paw or right. i favor whatever passes lint.",
  "the cat is the only semi-domesticated pet. i prefer 'freelance'.",
  "cats can't taste sweetness. your README? i can tell.",
  "a cat sleeps in 100+ postures. my opinions: equally many.",
  "cats need 3 hrs of play a day. i budget 30 s per act.",
  "cats locate prey by sound. i locate bugs by stack trace.",
  "the purr heals bones. the pull request heals morale.",
  "cats always land on their feet. my fallback handlers agree.",
  "cats are crepuscular. so are my best ideas: dawn and dusk.",
  "cats hold eye contact to say 'yours'. mine says 'hire him'.",
  "cats spend half their waking hours grooming. i optimize comments.",
  "the internet's first meme was a cat. natural order restored.",
  "cats ignore the box the toy came in. devs ignore the docs. universal.",
  "whiskers are rangefinders. mine ping on every button you hover.",
  "small boxes calm cats. small diffs calm devs. physics.",
  "every cat is the main character. honestly, same about sachin.",
  "a cat's slow blink is 'i trust you'. do that to the contact form.",
  "cat pupils carry emotion. my ui states too.",
  "a cat's tongue has 1100 papillae. my code review: equally rough, lovingly.",
  "cats forget nothing important. also everything about your third tab.",
  "every cat is a small tiger. every codebase, a small monorepo.",
  "cats resist being carried. your users resist onboarding flows too.",
  "cat ears rotate 180°. mine at the word 'deadline'.",
  "the cat sleeps on the keyboard. the build still passes. this is skill.",
  "sachin built basecase — a Q&A platform for devs. i supervise the rep engine.",
  "his repos include a 'Meow Terminal AI Agent'. finally, a namesake.",
  "the bank app runs on spring boot. i knock things off springboards.",
  "this site's graph holds 300+ notes he actually wrote. i napped on some.",
  "he ships react and three.js by day. i ship hairballs.",
  "he named a project 'meow'. the marketing department is me.",
  "luna was his best architectural decision. peer-reviewed by whiskers.",
  "his answer to 'tell me about yourself' is a knowledge graph. bold.",
  "dhun grew from a folder browser into a whole player. i watched. i napped, but i watched.",
  "basecase has dark mode because the cat requested it. diplomatic.",
  "the netflix clone's logos were pixel-perfect. i measured with my eyes.",
  "alienblaster is a 2d platformer he wrote in c#. i'd chase every sprite.",
  "his hyprland dotfiles rice so hard even my fur lies flat. (lua, btw.)",
  "quantyx calculates everything except how many naps i've taken.",
  "he built a full stackoverflow clone for fun. answers everywhere, snacks nowhere.",
  "the graph vault holds 330 notes. mine: 331 (this bubble counts).",
  "he watches mit asymptotics lectures at 1am. big-O, big mood.",
  "openclaw lives in his terminal. it claws, it meows, it summarizes.",
  "his lld notes hide a zomato clone. appetite for patterns, literally.",
  "chai is his fuel, biryani his reward. the food pyramid is round and warm.",
  "the bank app has 'meow' in its name. the stakeholders: me.",
  "he built the games he'd want to play, then shipped them to itch. dangerously recursive.",
  "this site ships with a tour guide (me), a graph, and zero dog code.",
  "sachin's interview answer is this whole site. my favorite part: me.",
  "the contact form emails him directly. i read over your shoulder. confidentiality: meow.",
  "he tests on real devices. i test on real furniture. both valid.",
  "he ships at 2am. i supervise at 2am. different roles, same zoomies.",
  "his lld notes get read more than some startups' blogs. patterns pay rent.",
  "the tour, the graph, the cat — three ways to say 'look what he built'.",
  "every good portfolio needs a mascot. he just didn't expect hers to have opinions.",
  "his graph view renders 330+ notes live — cytoscape sweats, i nap.",
  "the 3d scenes lazy-load. even the three.js knows pacing.",
  "he gave the cat a tour duty. i call it owning the floor.",
  "the contact form sends real mail. i intercept the drama first (errors, cheers).",
  "his best pitch is this site. mine is the bubble you're reading.",
  "three careers in one tab: dev, writer, cat manager.",
  "he answers 'where in 5 years' with a graph of his notes. bold move.",
  "the sitemap stamps today's date. my patrol route: every pixel, hourly.",
  "portfolio checksum: one dev, one cat, zero regrets.",
].map((s) => s);

const OBSERVATIONS = [
  "you scroll like someone with a plan. i like that.",
  "this portfolio passes the cat test. certified.",
  "i checked the source. nice tabs (the browser kind, i only allow floor tabs).",
  "whoever designed this knew cats would approve.",
  "the pixels here have excellent feng shui.",
  "you came back. cats respect loyalty.",
  "i've seen your cursor path. it's indecisive but charming.",
  "you hover before you click. thoughtful. rare.",
  "three tabs open, huh? bold.",
  "you read the alt text. i saw. heroes do that.",
  "your scroll speed says: curious, slightly impatient. classic.",
  "you didn't skip the footer. noted, appreciated.",
  "someone here cares about details. probably the cat.",
  "the spacing on this page is purr-worthy.",
  "a good favicon. a great commitment to whimsy.",
  "you stopped on that section. good taste.",
  "i can tell you built this at night. the vibes are 1am.",
  "every scroll is a small act of trust. i won't waste it.",
  "you know what's underrated? blinking slowly at a build that passes.",
  "this page has the exact number of cats: not enough. working on it.",
  "you didn't refresh. interesting. usually people refresh like i knock things off.",
  "you use the keyboard. automatically cool in my book.",
  "the dark theme here doesn't hurt my night vision. 10/10.",
  "you scrolled back up? checking work? i do that too.",
  "i believe in you. also in lazy loading.",
  "you're one click away from something good. or just another tab. no judgment.",
  "there's an elegance to this layout i rarely judge harshly.",
  "i watched the whole page load. smooth. like my landing.",
  "the way you move the mouse, chef's kiss.",
  "you hovered the cat. instinct. i respect it.",
  "if trust were a metric, you'd be p95 excellent.",
  "you've been here a bit. should i start charging rent? (cats don't pay rent).",
  "small tip from a professional: nap between deploys.",
  "you didn't open devtools. restraint. admirable.",
  "this navigation has zero dead ends. i checked every room.",
  "your patience with my slow walk is noted and appreciated.",
  "i'd hire whoever made the hover states here. oh wait.",
  "you're reading this in a tiny bubble near a cat. life is good.",
  "some people scroll for content. you scroll for vibes. welcome.",
  "i don't say this to everyone: your 404 page has heart.",
  "you clicked something unexpected? good. curiosity is feline.",
  "the gradient on this site has layers. like my napping spots.",
  "you kept me around this long. i'll allow it.",
  "i counted the sections. i approve of the count.",
  "we're both just trying our best. you coding, me supervising.",
  "you treat scroll like a conversation. so do i.",
  "i'd bat this layout around like yarn. gently. lovingly.",
  "everything's a little better with a cat in the corner.",
  "your attention is a gift. i'll nap on it.",
  "you didn't shoo me. wisdom.",
  "i think we have an understanding now.",
  "the cat approves this message.",
  "you have the energy of someone who backs up their code. i hope.",
  "quiet confidence. like a cat on a windowsill.",
  "you're still here? excellent. the fish budget is unlimited (pretend).",
  "if this page were a room, i'd claim the sunniest corner of it.",
  "you're browsing in a way that says: show me everything. working on it.",
  "i like the cut of your jib. it has good click targets.",
  "remember: hydration, stretch, blink. cats do all three professionally.",
  "this is your sign to drink water. yes, now.",
  "you found the easter egg (i'm the easter egg).",
  "no popups here. only a cat. design done right.",
  "your cursor has excellent manners.",
  "i'll be honest: i napped through your entire hero animation. it was good though.",
  "you don't rush. a discerning visitor.",
  "the details here reward a second look. i've had twelve.",
  "you move with intent. i move with hunger. same energy.",
  "we've been together a whole session and you haven't shooed me. friendship.",
  "your clicks are gentle. noted, reciprocated in purrs.",
  "someone raised you right: you read the label before clicking.",
  "staying this long counts as fostering. adoption papers are in the mail.",
  "you glance at the cat mid-read. we share the brain cell, clearly.",
  "your hover patterns say 'curious'. my tail says 'obviously'.",
].map((s) => s);

const GUIDE_LINES = [
  "this way~ the good stuff is just below.",
  "chalo, next room~ i'll lead.",
  "you're following the tour. good visitor.",
  "psst— keep scrolling. trust the cat.",
  "guided tour, free. i accept pets as tips.",
  "yahan se dekho— this section's my favorite.",
  "kya dekhna chahoge? sab kuch hai neeche.",
  "portfolio rule: scroll to the end. i'll know.",
  "hire sachin? his email is one scroll away.",
  "drop him an email. he actually replies. (unlike some.)",
  "looking for a dev? you're looking at his work right now.",
  "he built this at night. cats approve of night work.",
  "sachin does the work. i take the credit. deal with it.",
  "every pixel here was placed by hand. sniff-test passed.",
  "no templates were harmed in this portfolio.",
  "view source is allowed. he's proud of it.",
  "the code is clean. i checked. fur-free.",
  "you've seen one room. the next one's better. classic tour.",
  "i've toured this place 330 times. still nap in the blog.",
  "experience section ahead— bring respect.",
  "skills don't self-promote. that's my job.",
  "take your time. the cat is patient. the cursor, less so.",
  "not lost? good. follow the nav. or me.",
  "you click, i comment. we make a good team.",
  "scroll depth: touristic. i like it.",
  "remember: hire sachin. that's the whole tour, really.",
  "one more room after this. promise.",
  "haan, yehi wala best hai. this one.",
  "the exit is at the bottom. no rush.",
  "i live here now. rent: pets.",
  "you're doing great. slightly above average, even.",
  "advice for free: open the graph view. it's pretty.",
  "the games tab exists. don't tell anyone i told you.",
  "mailto: is my favorite hyperlink. figure out why.",
  "you scrolled this far. sachin would call that interest.",
  "new here? start at the top. or the bottom. your call.",
  "i don't do hard sells. just gentle, persistent purring.",
  "this tour has zero popups. design done right.",
  "maan lo— this portfolio is worth a second look.",
  "the cat approves this portfolio. strongly.",
  "he runs arch linux and neovim. config files are public. nerdy. good.",
  "there's a repo called Meow Mega Corp Bank. yes, meow. yes, spring boot.",
  "he watched the MIT asymptotics lecture. big-O, but educational.",
  "he has 34 repos. i have 9 lives. we're both collectors.",
  "his obsidian vault has a zomato clone hiding in the LLD notes.",
  "dhun is his spotify clone — plain html, css, js. css did the heavy lifting.",
  "his itch.io page has games you can play. then hire him. sequence matters.",
  "the nav works. i tested it. with my face.",
  "every link here leads somewhere real. verified. whisker-tested.",
  "somewhere below, a contact form waits for you. patiently.",
  "scroll depth is my favorite metric. you're crushing it.",
  "this section brought to you by: caffeine and a cat.",
  "he wrote the copy. i approved the tone.",
  "portfolio reviews: cat, unbiased (extremely biased).",
  "recruiter? the feeling is mutual — we've been expecting you.",
  "the projects below survive daily scrutiny. i scrutinize.",
  "nothing here is a placeholder. i eat placeholders.",
  "his commit messages make sense. i purr at them.",
  "you're at the part where curiosity becomes an email.",
  "been here a while? the cat notices. fondly.",
  "there's a graph view for visual thinkers. i see triangles too.",
  "take a screenshot — the cat will remember your face.",
  "one scroll deeper and i start counting your clicks. (already did.)",
  "the experience section reads like a good commit log: clean story.",
  "the skills pills link to proof. receipts attached, whisker-verified.",
  "he's learning in public — the vault shows his homework. brave.",
  "if you like what you see, the send button's right there. i guard it personally.",
  "step by step, scroll by scroll. the cat paces you.",
  "haan haan, thoda aur neeche — the good part is coming.",
  "every project down there survived a real deadline. some of them mine.",
].map((s) => s);

const WISDOM = [
  "the best code is the code you didn't write. i wrote none. purrfection.",
  "a bug is just a feature that hasn't been petted yet.",
  "ship it, then nap. that's the whole methodology.",
  "measure twice, cut once, nap thrice.",
  "slow is smooth. smooth is fast. napping is faster.",
  "the sunbeam you want is the one you're already in.",
  "all roads lead to a warm keyboard.",
  "perfection is one paw print away from good enough.",
  "delete more than you add. nap more than you delete.",
  "if it compiles, it ships. if it purrs, it's done.",
  "don't chase the cursor. let it come to you.",
  "you can always add another tab. you cannot un-tab a thought.",
  "the sun doesn't rush and neither should your deploy.",
  "simplicity is the soul of elegance. also of fewer bugs.",
  "a clean desk is a sign of a cluttered trash folder.",
  "the only constant is change. and the cat's dinner time.",
  "what the wise programmer knows: it's always dns.",
  "the quieter the build, the louder the confidence.",
  "there is no undo for a purr. only more purrs.",
  "when in doubt, zoom out. when scared, loaf.",
  "a good name saves a thousand comments.",
  "the middle of the night is for ideas. morning is for git.",
  "don't fix it while angry. nap on it.",
  "too many cooks spoil the broth. too many tabs spoil the RAM.",
  "the journey of a thousand commits begins with one `git init`.",
  "water your plants. hydrate your code. both need light.",
  "the simplest explanation is usually a missing semicolon.",
  "your future self will thank you. or judge you. back up either way.",
  "chase one yarn at a time.",
  "discipline is choosing between what you want now and what you want purrmanently.",
  "the empty states matter. they're where cats sleep.",
  "a system is only as good as its worst error message.",
  "give a developer a fish and they eat for a day. teach them to lazy-load...",
  "the best time to write tests was yesterday. the second best time: before lunch.",
  "rest is not laziness. it's background processing.",
  "curiosity killed the cat. satisfaction brought it back (with tests).",
  "a watched build never passes. go get water.",
  "naming things is hard. cats make it look easy: everything is 'cat'.",
  "leave the code better than you found it. like a sunbeam.",
  "if you can't say it simply, you don't understand it. or it's css.",
  "the obstacle is the path. the bug is the feature brief.",
  "small steps still cross the room. especially with a toy.",
  "don't compare your chapter one to someone's chapter twenty. compare naps.",
  "attention is the rarest currency. spend it on one tab.",
  "make it work, make it right, make it fast. then nap.",
  "there's dignity in every honest commit.",
  "the yarn ball's lesson: pull one thread, enjoy the chaos.",
  "consistency beats intensity. so does a daily nap.",
  "write it down or it never happened. that's what notes are for.",
  "the best debug session ends with a walk. i'll supervise.",
  "hire slow, ship fast. pet generous, nap always.",
  "a clean repo is a clean mind. a clean desk is optional.",
  "your future self thanks your past self. mine naps in both.",
  "ship the small thing. the big thing fears momentum.",
  "what gets measured gets managed. what gets napped gets... napped.",
  "you can't pour from an empty cup. you can't code from an un-napped brain.",
  "kindness ships better than urgency. also compiles faster.",
  "the code remembers what the README forgets. write both.",
  "walk away. the answer is usually behind you (in another file).",
  "fewer moving parts, fewer regrets, more purrs.",
  "the world runs on small kindnesses and smaller bundles.",
  "today's homework: touch grass, then touch type.",
  "confidence is knowing the build will pass. checking anyway.",
  "the last 10% takes 90% of the time. so does a good nap cycle.",
  "when the answer is unclear, walk. literally. paws help.",
].map((s) => s);

const PREDICTIONS: { say: string; verify: "scroll" | "click"; hit: string; miss: string }[] = [
  { say: "prophecy: you will scroll within 10 seconds.", verify: "scroll", hit: "called it. i saw it in the yarn.", miss: "hm. no scroll. the future is fake." },
  { say: "i predict: next, you click something.", verify: "click", hit: "naturally. i am very wise.", miss: "the timeline wobbled. try again." },
  { say: "watch: you'll scroll in 3… 2… eh, 10 seconds.", verify: "scroll", hit: "i don't even need whiskers for that one.", miss: "the prophecy needed more naps." },
  { say: "you're about to touch the mousewheel. i can taste it.", verify: "scroll", hit: "told you. cat intuition.", miss: "tastes like nothing. hm." },
  { say: "prediction: a click, incoming.", verify: "click", hit: "and the crowd goes mild. called it.", miss: "you rescheduled your destiny. fine." },
  { say: "next gesture: scroll. final answer.", verify: "scroll", hit: "another one from the cat oracle.", miss: "the oracle takes weekends." },
  { say: "in your next 10 seconds: one (1) click.", verify: "click", hit: "one click. exactly as written.", miss: "you clicked in your heart. doesn't count." },
  { say: "the yarn says: you will scroll soon.", verify: "scroll", hit: "the yarn also says: called it.", miss: "the yarn lied. we'll have words." },
  { say: "i see… movement… in your scroll finger…", verify: "scroll", hit: "i see everything. slowly.", miss: "i see nothing. blocked by your tab." },
  { say: "dare you to not scroll for 10 seconds.", verify: "scroll", hit: "you couldn't resist. prophecy + dare.", miss: "willpower of a rock. impressive, actually." },
  { say: "your next click will surprise no one. especially me.", verify: "click", hit: "no one. especially me.", miss: "surprised me. mildly. well played." },
  { say: "the future is scroll-shaped.", verify: "scroll", hit: "scroll-shaped confirmed.", miss: "cat-shaped, apparently. my bad." },
];

const ROUTE_POOLS: Record<string, readonly string[]> = {
  "/": ["home sweet home~", "back to the start. the circle of scroll.", "home again. the porch light was on.", "this room has the best furniture.", "home. where the keyboard is warm."],
  "/blog": ["330 notes~ i've read every one of them.", "so many notes~ the vault purrs.", "the blog. i've read all of it. opinions vary.", "330 notes and one opinionated cat.", "words upon words~ i judge them warmly."],
  "/graph": ["every node knows my name.", "so many nodes~ i could nap on all of them.", "the graph hums. i listen.", "edges everywhere. like my whiskers.", "a constellation of notes~ beautiful."],
  "/projects": ["projects~ the good stuff.", "shipped, staged, admired. the holy trinity.", "which project? i purred on all of them.", "the showcase. bring snacks.", "demos load. i supervise."],
};
const POST_LINES = [
  "mmm. good read~", "reading, are we? i'll supervise.", "a post~ settle in.",
  "this one has excellent paragraphs. i can tell by the leading.",
  "i read this one already. three naps ago.", "the title promised. the body delivered.",
  "good use of headings. 10/10 scannability.", "i kneaded this paragraph. it stayed.",
  "scroll on. i'm listening.", "words are just yarn for the brain.",
  "this paragraph had it coming.", "the author has a way with words. (it's you).",
];
const GENERIC_ROOMS = ["new room~", "ooh, elsewhere.", "the rooms all smell nice here.", "exploring. i approve.", "another door. another nap spot.", "you move, i follow. classic.", "hallway energy. i like it.", "this place has potential.", "hmm. good feng shui.", "i'll allow it."];

export const routeLine = (path: string, ctx: CatContext): string => {
  if (path.startsWith("/blog/post")) {
    const base = POST_LINES[rand(POST_LINES.length)];
    if (ctx.scrollPct > 85) return `you're ${ctx.scrollPct}% deep. respect.`;
    return base;
  }
  const pool = ROUTE_POOLS[path];
  if (pool) return freshPick(pool);
  if (!isKnownPath(path)) return freshPick(FOUR_OH_FOUR);
  return freshPick(GENERIC_ROOMS);
};

/* landing: she greets the room by its real headline (hero h1, page
   title) instead of a generic pool line — the site's own words */
const LANDED = [
  "welcome to «{title}». it suits you.",
  "you're in «{title}» now — i know the layout.",
  "landing in «{title}». mind the cat.",
  "«{title}». a fine room. i've napped here.",
  "so — «{title}». good taste, that.",
  "this corner is «{title}». stay a while.",
];
export const landedLine = (title: string): string =>
  freshPick(LANDED).replace("{title}", clip(title, 48));

/* room memory: she keeps a tally of where you return to, so the third
   lap around experience reads like a shared habit, not a first hello */
const FAMILIAR = [
  "back to {room} — visit #{count}. the nap spot remembers you.",
  "{room} again? that's {count} times. i'm keeping count. fondly.",
  "you gravitate to {room}. noted, cataloged, approved. ({ord})",
  "{room} still smells the same. {count} visits and counting.",
  "the {room} routine — {count} laps. we could do this forever.",
  "{room}, {count} times now. i'd call that a habit. i'd call it good.",
];
const roomName = (path: string): string => {
  if (path === "/") return "home";
  if (path.startsWith("/blog/post")) return "that note";
  const seg = decodeURIComponent(path.replace(/^\/+/, ""))
    .split("/")
    .filter(Boolean);
  return seg.length ? seg.join(" / ") : "home";
};
const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
export const familiarLine = (path: string, count: number): string =>
  freshPick(FAMILIAR)
    .replace("{room}", roomName(path))
    .replace("{count}", String(count))
    .replace("{ord}", ordinal(count));

/* ------------------------ click awareness ------------------------ */

export type ClickKind =
  | "email" | "games" | "github" | "linkedin" | "leetcode" | "x"
  | "external" | "card" | "graph";

const CLICK_POOLS: Record<ClickKind, readonly string[]> = {
  email: [
    "you found the mail. he replies faster than you'd think.",
    "one message, one candidate. smart move.",
    "compose wisely — he reads every single one.",
    "the email button's favorite visitor. (biased cat.)",
    "inbox, meet sachin's next team. honestly.",
  ],
  games: [
    "games~ win one, hire him. i don't make the rules. (i do.)",
    "play first, hire later. or both. i support both.",
    "itch.io~ serious research territory. have fun.",
    "his games. built for fun, shipped with proof.",
  ],
  github: [
    "the commits live here. stars are free. (he checks.)",
    "github~ mind the history. it's clean.",
    "fork it. clone it. hire him. (order is flexible.)",
    "his code in the wild. be gentle. or be impressed.",
    "34 repos in there. i've buried fewer bones.",
    "AlienBlaster lives here — a 2D platformer he wrote in C#.",
    "BaseCase is the flagship. q&a platform, zod schemas, dark mode.",
    "Arch-config: hyprland + lua dotfiles. they slap.",
    "he cloned twitter with tailwind + express + ejs. old stack, new polish.",
    "Quantyx — a web calculator. everyone starts somewhere; he shipped it anyway.",
  ],
  linkedin: [
    "professional mode: engaged.",
    "very employable energy. the cat approves.",
    "recruiters live here. lately, so does he.",
  ],
  leetcode: [
    "the leetcode grind is real. b2mIkNz0h5 — nobody said profiling was pretty.",
    "problem solved somewhere in there. another cat nap unlocked.",
    "dsa mode: on. hired mode: pending.",
    "MIT asymptotics notes back this up. big-O, bigger effort.",
    "he solves algorithms for fun. imagine what he'd do for payroll.",
  ],
  x: [
    "@samtagon38824. the cat does not run the account. unfortunately.",
    "he posts between commits. so: rarely, but with intent.",
    "follow for code. the cat content is theoretical.",
    "the tweets are real. unlike his sleep schedule.",
  ],
  external: [
    "outside the portfolio~ come back, the cat gets lonely.",
    "a new tab. brave.",
    "tell them the cat sent you.",
    "the open web. wild place. come back safely.",
  ],
  card: [
    "that box? checked. he's good at those.",
    "click, inspect, scrutinize. it all holds up.",
    "you're reading the cards? the fourth one is my favorite.",
    "certified by the cat. multiple times.",
    "solid card. excellent leading. i napped on it.",
  ],
  graph: [
    "ooh, that corner of the vault.",
    "good node. it purrs.",
    "click around~ every path leads to a note.",
    "330 nodes, one cat. simple math.",
  ],
};
export const clickLine = (kind: ClickKind): string =>
  freshPick(CLICK_POOLS[kind]);

/* ---------------------- typed keyword lines ---------------------- */

export const KEYWORD_LINES: Record<string, readonly string[]> = {
  luna: [
    "that's ME. say it again, i dare you.",
    "you typed my name~ pets accepted here.",
    "luna reporting. obviously.",
    "yes? oh— you mean the cat. that's me.",
    "luna: professional napper, certified guide.",
    "four letters, infinite charm.",
    "you know my name. we're friends now.",
    "calling me by name? bold. i like you.",
  ],
  meow: [
    "meow detected. translation: hire him.",
    "you're meowing at a cat. bold. i respect it.",
    "mrow~ that's 'send the offer' in cat.",
    "meow means yes. meow also means hire. mostly hire.",
    "cat support online. your issue: not hired yet. your fix: the form below.",
    "meow meow. no dog detected. you're safe.",
    "typing meow costs nothing. hiring sachin costs his competitors.",
    "he taught me that word. lies. i was born with it.",
    "mrow? that's '404: dog not found' in cat.",
    "again? the contact form works too, you know.",
  ],
  hire: [
    "you spelled it right. gold star. now use the form.",
    "HIRE — the correct keyword. rewards: one (1) sachin.",
    "type it here all day; the form below actually sends it.",
    "cat hr department: offer letters go to the contact section.",
    "he's 2nd year b.tech and ships like it's year four. just saying.",
    "cheat code accepted. console is #contact.",
    "no takebacks. the cat heard you.",
    "yes. hire. next question.",
    "escalated your case. destination: the footer, then the form.",
    "one keyword closer. next stop: contact section.",
  ],
  hi: [
    "hi~ you found the cat.",
    "hello. tours start whenever you scroll.",
    "nya— hi. i'm luna, obviously.",
    "hey. sass included at no extra cost.",
    "hi! pet me or scroll. both work.",
    "greetings. i'm the HR department. and the office.",
    "oh, hi. i was pretending to nap.",
    "hello human. the other human here is hireable.",
  ],
  joke: [
    "why don't cats play poker in the jungle? too many cheetahs. (i'm sorry.)",
    "i told sachin a javascript joke. he returned undefined.",
    "what's a cat's favorite color? purr-ple.",
    "how do cats end a fight? they hiss and make up.",
    "i asked the yarn for directions. it led me in circles. perfect.",
    "why was the cat on the computer? to keep an eye on the mouse.",
    "the joke repo has34 stars. all self-published.",
    "that's the whole joke. the real joke is unpaid internships.",
  ],
  help: [
    "shortcuts: pspsps = call me, a/d = accept/skip suggestion, alt+c = shoo.",
    "type these at me: luna, meow, hire, joke, thanks, fish, sachin.",
    "you're doing great. to hire him: #contact. to pet me: click.",
    "keyboard: a accepts, d dismisses, alt+c bans me (don't).",
    "tip: type 'fish' for science.",
    "manual: scroll, click, type nonsense. i react to everything.",
    "help desk open. issue: not enough pets. solution: more pets.",
    "lost? pspsps brings me. the nav brings you.",
  ],
  thanks: [
    "you're welcome. pets accepted as payment.",
    "gratitude detected~ purring resumed.",
    "anytime. that's what tour guides do.",
    "thanks back. now hire him, we're all set.",
    "politely received. very employable human.",
    "mwrow~ (that's 'thanks' in cat).",
  ],
  fish: [
    "fish?! where— oh. you're my favorite.",
    "tuna detected. i'm listening.",
    "a fish! this meeting just improved.",
    "accepting fish as a signing bonus.",
    "you brought fish. sachin brings code. good team.",
    "nom nom. hire him, fish me later.",
  ],
  sachin: [
    "sachin: the reason this site exists. hire him.",
    "that's my human. 2nd year, full-stack, questionable sleep.",
    "you called? oh— HIM. he's the one with the skills.",
    "sachin chandra yadav. remember the name. recruiters do.",
    "he coded this, i supervised. division of labor.",
    "sachin: available for hire. cat: available for pets.",
  ],
  nya: [
    "nya nya~ back at you.",
    "the official cat language. fluent.",
    "nya means everything. context: vibes.",
    "you speak nya? impressive. hireable, even.",
    "nya. (translation below.) — there is no translation.",
  ],
  tuna: [
    "TUNA? speak more slowly.",
    "the good stuff. spring-loaded for tuna.",
    "tuna: accepted as payment. one can = one tour.",
    "you know my weakness. we're close now.",
    "tuna detected over here~",
  ],
  yarn: [
    "yarn! deploying ball...",
    "you said yarn. instincts: activated.",
    "where?! — oh, you meant emotionally. still good.",
    "yarn is my love language.",
    "rolling out the yarn. watch the corners.",
  ],
  nap: [
    "nap accepted. zZz incoming.",
    "you typed the magic word. eyelids: closing.",
    "official nap request granted. do not disturb.",
    "i was going to nap anyway. thanks for the push.",
    "nap mode: engaged. hire sachin while i rest.",
  ],
  chai: [
    "chai detected. sachin runs on it.",
    "one chai = two commits. science.",
    "masala or cardamom? the cat judges silently.",
    "spill the chai AND the hiring details.",
    "steaming cup energy~ the code reviews itself.",
  ],
  dog: [
    "WOOF—?! where. where is it. (phew.)",
    "a dog? in THIS portfolio? tact.",
    "dog mentioned. whiskers: fully bristled.",
    "wrong house, good boy. MOVE ALONG.",
    "i heard a bark once. never again.",
    "dogs: 0, cats: 1. final standings.",
  ],
  cat: [
    "correct. i am a cat. gold star.",
    "cat detected. ambient purr engaged.",
    "meow's formal cousin: 'cat'.",
    "you typed the species. i typed 'hire'. different priorities.",
    "100% cat. 0% dog. certified.",
  ],
  box: [
    "a BOX? where. — oh. emotionally. i'm already in one.",
    "boxes: the original design system.",
    "if i fits: i sits. if you hire: we're set.",
    "box mentioned. loafing is a valid response.",
    "cardboard > cloud computing. (i am the rule.)",
  ],
  sudo: [
    "sudo does NOT work on cats. i checked from the inside.",
    "root: me. you: guest with vibes.",
    "nice try. cats are not daemons.",
    "permission denied. (unless you carry tuna.)",
    "sudo make me a sandwich? make it tuna.",
  ],
  ship: [
    "ship it. i'll nap on the release notes.",
    "deploy on friday? i'll pretend i didn't hear that.",
    "it compiles — ship before it changes its mind.",
    "green build? say less. SHIP.",
    "release day~ my favorite kind of chaos.",
  ],
  bug: [
    "bug found: cat refuses to leave keyboard. status: expected.",
    "it's not a bug, it's an undocumented feature. i invented that.",
    "a bug is just a toy that hasn't been patted yet.",
    "debugging: staring until the bug apologizes.",
    "works on my machine. (i am the machine.)",
  ],
  coffee: [
    "coffee detected. sachin's second bloodstream.",
    "one coffee = two standups of courage.",
    "black coffee, clean code.",
    "the coffee cup: enemy of warm laps, friend of deadlines.",
    "caffeine, because adulting. same reason for naps.",
  ],
  music: [
    "dhun is his music player — built it, so the volume is his.",
    "music on? the tail starts keeping time.",
    "a good playlist is just organized purring.",
    "turn it up. cats hear everything. EVERYTHING.",
    "folder-based music player. that's the kind of dev he is.",
  ],
  game: [
    "his games live on itch.io. win one, hire him.",
    "game detected. the cat accepts all controllers.",
    "games are just interactive yarn.",
    "press start. i'll supervise.",
    "high score or it didn't happen. (he ships either way.)",
  ],
  resume: [
    "his resume is the page you're on. meta.",
    "cv detected. the whole site IS the résumé.",
    "resume? he ships proof instead. links above.",
    "one page, many tabs. that's the vibe.",
    "print it? just send the link. it's interactive.",
  ],
  job: [
    "job detected. the cat endorses this message.",
    "ideal job: shipping with a cat on the desk.",
    "hire him. i'll handle references.",
    "open to work — technically open to pets too.",
    "the job search ends where the contact form begins.",
  ],
  love: [
    "love detected. hearts deployed.",
    "love? the cat accepts pets as currency.",
    "spread love. and hire sachin.",
    "affection received. returning it2x.",
    "the greatest love language: merged PRs.",
  ],
  dance: [
    "dance break~ the tail keeps the beat.",
    "two hops minimum. house rules.",
    "cats don't dance. (this one does.)",
    "the paws say: four-four time.",
    "drop the beat, not the build.",
  ],
  email: [
    "samtagon777@gmail.com — warm inbox, warmer replies.",
    "email him. the cat can't read it. yet.",
    "one email away from a very good decision.",
    "his inbox: alive and responsive. verified by cat.",
    "compose. send. watch for the reply-purr.",
  ],
  git: [
    "commit often. pet often. same energy.",
    "git push --force on main? the cat disapproves. loudly.",
    "his git graph: a work of art. i napped on it.",
    "branch out. merge. nap. repeat.",
    "merge conflicts build character. and rage.",
  ],
  python: [
    "python detected. snake energy, zero emoji.",
    "his python: leetcode grind and scripts that just work.",
    "pythonic: readable, calm, well-mannered. like the cat.",
    "import sachin — package-ready.",
    "the GIL and i agree: take turns napping.",
  ],
  react: [
    "react to THIS: you're already inside a react app.",
    "components all the way down. like nesting boxes.",
    "state management: the cat has none. (pure contentment.)",
    "rerenders? only when petted.",
    "use(cat) returns: purr.",
  ],
  arch: [
    "arch linux + neovim. dotfiles public. brave.",
    "he uses arch, btw. (you were waiting.)",
    "AUR enjoyer. dotfiles believer.",
    "rolling release, rolling with it.",
    "arch install beat him up first. then the interview.",
  ],
  who: [
    "sachin. obviously. you're talking to his cat.",
    "who's a good dev? wrong question. wrong — he is.",
    "the man, the myth, the commit history.",
    "sachin yadav. remember it. spell it right.",
    "him. obviously. now say hi.",
  ],
  why: [
    "why? because the cat said so.",
    "why not? — every great project's origin story.",
    "why hire sachin? scroll to the contact form. that's why.",
    "because someone has to ship good things. it's him.",
    "why are you still reading? go say hello.",
  ],
  node: [
    "node_modules: 400 mb of pure faith.",
    "npm install sachin. zero vulnerabilities, i checked.",
    "the event loop never sleeps. unlike me, professionally.",
    "one layer deep in dependencies, two deep in naps.",
    "node? runs everywhere except my nap schedule.",
  ],
  deploy: [
    "deploy: the moment everyone pretends to be calm.",
    "green pipeline detected. purring intensifies.",
    "rollback is a state of mind. deploy anyway.",
    "friday 5 pm deploy? bold. i'd nap and reconsider.",
    "ci says pass. i says purr. we are both correct.",
  ],
  vim: [
    "vim: normal mode is a lifestyle.",
    "esc esc esc. still home. vim circle of life.",
    "you don't learn vim. vim keeps you.",
    "hjkl: four directions, zero progress, infinite style.",
    "`:wq` and out. that's the whole tutorial.",
  ],
  linux: [
    "linux: everything is a file, even my nap log.",
    "sudo makes anyone feel like an admin. even cats.",
    "i distro-hop weekly. currently arch, obviously.",
    "chmod +x your dreams. or at least the build script.",
    "the penguin and i have an understanding. i nap on the kernel.",
  ],
  typescript: [
    "typescript: because `any` is a cry for help.",
    "the type checker and i: same energy, more purring.",
    "generics: types wearing types wearing types.",
    "strict mode: on. my nap schedule: strict too.",
    "type error in the cat file: expected meow, got purr.",
  ],
  docker: [
    "docker: ships in boxes. i approve. boxes are great.",
    "it works on my machine → it works in the container.",
    "one image, many containers, zero excuses.",
    "the whale carries the code. whales are just big fish.",
    "compose up. the cats supervise.",
  ],
  hello: [
    "hello. tours start whenever you scroll.",
    "hi again. the keyboard and you: a classic duo.",
    "greetings. you found the greeting. rare achievement.",
    "hello back. sachin says hi too, silently.",
    "hello~ the cat was expecting you roughly now.",
  ],
  nice: [
    "nice. that word purrs well.",
    "nice detected. filing under: good vibes.",
    "you say nice, i hear treat.",
    "flattery: the fastest way to my attention.",
    "nice is nice. hire is nicer.",
  ],
  wow: [
    "wow received. i do aim to impress.",
    "wow! say it again. slower this time.",
    "wow. modesty prevents me from agreeing loudly. (i agree loudly.)",
    "the correct reaction to any page with a cat on it.",
    "wow~ my favorite vowel combination.",
  ],
  cool: [
    "cool. cooler. cat with a portfolio. (him, not me. mostly me.)",
    "cool noted. temperature: unbothered.",
    "you think it's cool? the deployment thinks so too.",
    "cool is a state of mind. mine is 22 celsius.",
    "cool. now type hire. for science.",
  ],
  india: [
    "india: where the chai is strong and the commits stronger.",
    "sachin yadav, from india, for the world. timezone-proof.",
    "the land of festivals, frameworks, and flaky power backups.",
    "india runs on chai. sachin runs on chai and ci.",
    "from india with bandwidth. remote-ready since forever.",
  ],
  sql: [
    "sql: i only purr in select statements.",
    "drop table fear; -- executed.",
    "joins: how relationships should work. indexed, too.",
    "select * from sachin where available = true;",
    "the database remembers. so do i. (naps, specifically.)",
  ],
  api: [
    "rest api: the cat approves of statelessness.",
    "http codes: 200 for vibes, 404 for missing treats.",
    "api first. the ui can wait. the cat naps meanwhile.",
    "endpoints: few. purrs: unlimited.",
    "one endpoint away from hire. it's /contact.",
  ],
  java: [
    "java: write once, debug everywhere. respectfully.",
    "the jvm and i: both run everywhere and nap often.",
    "null pointer? never met her.",
    "springs: framework or season? yes.",
    "garbage collection: my preferred lifestyle.",
  ],
  rust: [
    "rust: the borrow checker never lets me down.",
    "fearless concurrency. fearless napping too.",
    "no null, no tears. ownership transferred to sachin.",
    "rust compiles slow so you don't ship fast mistakes.",
    "borrow checker said no. hire checker said yes.",
  ],
  biryani: [
    "biryani: sachin runs on chai and biryani. mostly.",
    "extra raita = extra confidence.",
    "the correct stack: rice, patience, raita.",
    "biryani deployment: slow-cooked, worth the wait.",
    "one plate of biryani = one clean build. i don't make the rules.",
  ],
  mouse: [
    "a mouse! ...oh. not the draggable kind.",
    "mouse detected. pounce protocol: pending.",
    "the real mouse lives in the wall. shy guy.",
    "click it twice. that's how you catch mice.",
    "mouse? where. (nowhere. always nowhere.)",
  ],
  bird: [
    "birds out there. i'm in here. life is hard.",
    "a bird! ...wait. a leaf. carry on.",
    "my inside voice wants to chirp at that.",
    "i could catch that bird. theoretically. spiritually.",
    "birds chirp at 6am. i judge them at 6am.",
  ],
  tea: [
    "tea > coffee. sachin disagrees, respectfully.",
    "cup of tea: the warm build.",
    "steeping... do not disturb the cat.",
    "two sugars and a review comment.",
    "tea: liquid focus. served purring.",
  ],
  pizza: [
    "pizza: the deploy food. arrives hot, gone fast.",
    "extra cheese = extra story points.",
    "pizza code reviews end badly. pizza code pairs don't.",
    "one slice per merged PR. fair trade.",
    "flat, folded, flawless. like a good layout.",
  ],
  travel: [
    "travel: bug reports from new timezones.",
    "the best stack is somewhere with good wifi.",
    "passport stamped. laptop packed. cat? unimpressed.",
    "wanderlust and push notifications.",
    "take the trip. the standup can wait.",
  ],
  sing: [
    "i hum in frequencies only monitors understand.",
    "♪ from the ninth life, now streaming.",
    "my range: from purr to notification sound.",
    "singing is just scrolling with your voice.",
    "one note. held forever. very cat.",
  ],
  play: [
    "play: the ceremony i skip for naps.",
    "play with me. the yarn is right there.",
    "let's play: you hire, i purr. rules explained.",
    "playtime is just testing with enthusiasm.",
    "yes. play. the floor is a toy, technically.",
  ],
  hide: [
    "hiding: effective. visible. still hiding.",
    "you can't find me. (you can. i'm by the footer.)",
    "peekaboo: the original ui pattern.",
    "hidden in the whitespace again.",
    "hide and seek. i've been seeking snacks.",
  ],
  fetch: [
    "fetch? that's a dog word. we've met, right?",
    "i don't fetch. i supervise fetching.",
    "fetch protocol: rejected by the cat board.",
    "throw it yourself. i'll judge the arc.",
    "fetch is a feature. out of scope. purring.",
  ],
  merge: [
    "merge conflicts: two branches, one nap.",
    "merge to main. gently. it's friday.",
    "conflict markers resolved with purrs.",
    "squash and merge: my favorite compression.",
    "the diff said it all. i read it anyway.",
  ],
  lint: [
    "lint: green like a promoted branch.",
    "the linter and i: both unforgiving, both right.",
    "warnings: counted. drama: contained.",
    "lint clean. the cat approves of clean tails.",
    "one warning away from perfect. relatable.",
  ],
  art: [
    "art: pixels arranged with feeling.",
    "that's design work. i can tell by the spacing.",
    "aesthetics: considered. the cat nods.",
    "visual hierarchy: the cat sits on top.",
    "colors chosen like treats: carefully.",
  ],
  dream: [
    "dreaming. it involves yarn and bandwidth.",
    "rem: measured in naps per night.",
    "i dream in 120 frames per second.",
    "the dream: sachin, hired, everyone napping.",
    "currently dreaming. do not push to main.",
  ],
  treat: [
    "you can't type treats into existence. ...okay, one.",
    "treat detected. dispensing approval.",
    "treats: the real currency here.",
    "one treat = one purr. inflation-proof.",
    "fine. a treat. but ask nicely.",
  ],
  belly: [
    "belly: a trap. classic.",
    "you looked at the belly. brave.",
    "belly rubs: application pending review.",
    "the belly button of the ui. proceed carefully.",
    "show belly = trust. you're hired-ish.",
  ],
  star: [
    "star the repo? the cat stars you back.",
    "stars: collected like sunbeams.",
    "one star per visitor. this one's yours.",
    "stargazing: developer edition.",
    "fork it. it's free. so are naps.",
  ],
  logic: [
    "logic: cats invented it. mostly.",
    "if this then that. if nap then always.",
    "boolean moods: purring (true).",
    "the logic checks out. i checked it twice.",
    "boolean cats: also true. always true.",
  ],
  css: [
    "cascade? i cascade naps.",
    "selectors named after me? flattering.",
    "css: the art of making boxes lie.",
    "specificity wars: the cat wins.",
    "flexbox until it flexes back.",
  ],
  html: [
    "semantic! even my meows are semantic.",
    "div soup with a cat on top.",
    "the original markup language of boxes.",
    "alt text: cat doing important work.",
    "tags closed, naps open.",
  ],
  aws: [
    "aws: a well-shed service.",
    "the cloud is just someone else's sunbeam.",
    "s3: simple storage of treats.",
    "elastic compute, inelastic naps.",
    "your bill sleeps better than you.",
  ],
  tests: [
    "tests pass? that's my favorite sound.",
    "green suite, green yarn.",
    "coverage: i cover the keyboard.",
    "flaky tests fear the cat.",
    "write it twice, nap once.",
  ],
  graphql: [
    "ask for exactly the fields you need. no more.",
    "one endpoint to rule the queries.",
    "no over-fetching. i barely fetch at all.",
    "mutation? i mutate naps.",
    "the schema already knows what you want.",
  ],
  redis: [
    "redis: cached in place, like a sunbeam.",
    "in-memory naps, zero latency.",
    "ttl: time to lounge.",
    "cache hits feel like warm keyboards.",
    "persistence? overrated. ask mysql.",
  ],
  figma: [
    "figma: the yarn ball of design files.",
    "auto-layout or chaos. i choose loaf.",
    "components all the way down.",
    "handoff? i hand off the mouse.",
    "the artboard is warm. i sit here now.",
  ],
  tailwind: [
    "utility classes: my claws, but useful.",
    "no build step for the zoomies.",
    "mx-auto? the cat is never centered.",
    "dark mode: obviously.",
    "every class a small, good decision.",
  ],
  remote: [
    "remote work: the cat approves loudly.",
    "commute: 0 seconds to the desk.",
    "async means nap-sync.",
    "camera off, purr on.",
    "work from anywhere with a warm spot.",
  ],
  offer: [
    "an offer! i accept on his behalf.",
    "offer letter: written in treats.",
    "negotiate. he won't. i will.",
    "sign it. i'll supervise.",
    "one offer, one very smug cat.",
  ],
  salary: [
    "salary talk: i only take kibble.",
    "comp bands are just yarn with numbers.",
    "ask high. he's worth the treat budget.",
    "equity? i prefer equity of sunbeams.",
    "number goes up, cat naps better.",
  ],
  internship: [
    "internship era: every senior starts tiny.",
    "he'd mentor. he taught me sit.",
    "first-PR energy is unmatched.",
    "learn fast, nap faster.",
    "the ladder starts at the windowsill.",
  ],
  seo: [
    "seo: the cat is already findable.",
    "meta tags or it didn't happen.",
    "crawl budget: naps and whiskers.",
    "ranking #1 for 'cat'. we're working on it.",
    "alt text wins. i said what i said.",
  ],
  llm: [
    "llm? i'm more of an s-m: small mammal.",
    "tokens are just very small treats.",
    "hallucinated? i do that with lasers.",
    "context window: one lap.",
    "the model purred back.",
  ],
  ramen: [
    "ramen: broth-based happiness.",
    "slurp loudly. code quietly.",
    "extra chashu, extra commits.",
    "noodles: yarn you can eat.",
    "one bowl, one build, zero errors.",
  ],
};
/* longest first so "sachin" never trips the "hi" inside it */
const KEYWORD_ORDER = Object.keys(KEYWORD_LINES).sort((a, b) => b.length - a.length);

/** longest keyword the buffer ends with, unless the buffer is still a
    prefix of a longer keyword in progress (typing "sachin" won't fire "hi") */
export const matchKeyword = (buf: string): string | null => {
  for (const w of KEYWORD_ORDER) {
    if (!buf.endsWith(w)) continue;
    const growing = KEYWORD_ORDER.some(
      (k) => k.length > w.length && k.startsWith(buf),
    );
    if (!growing) return w;
  }
  return null;
};
export const keywordLine = (word: string): string =>
  freshPick(KEYWORD_LINES[word] ?? KEYWORD_LINES.meow);

/* ------------- absence / scroll-rush / resize ------------- */

const ABSENT_SHORT = [
  "{s}s. you blinked. i counted.",
  "gone {s} seconds. the nerve.",
  "the tab wandered off for {s}s. forgiven. mostly.",
  "{s}s away~ i held your spot.",
  "i timed your absence: {s}s. sloppy, but welcome back.",
  "back already? {s}s felt longer to the yarn.",
];
const ABSENT_LONG = [
  "{s} seconds! the yarn barely noticed. i noticed.",
  "a whole {m} minutes. i aged nine lives minus one.",
  "{s}s of solitude. i've written three poems.",
  "you left for {m}m. i forgave you halfway. (kidding.)",
  "back! absence: {s}s. verdict: tolerated.",
  "{m} minutes gone. the portfolio missed you. so did the cat.",
];
export const absentLine = (ms: number): string => {
  const s = Math.max(1, Math.round(ms / 1000));
  const m = Math.max(1, Math.round(s / 60));
  const pool = s < 45 ? ABSENT_SHORT : ABSENT_LONG;
  return freshPick(pool)
    .replace(/\{s\}/g, String(s))
    .replace(/\{m\}/g, String(m));
};

const RUSH_LINES = [
  "whoa— the wheel's not a pedal. this isn't a speedrun.",
  "speed scroll detected. the content is still there, promise.",
  "blurring past~ even i can't nap that fast.",
  "scroll: 11/10. comprehension: pending.",
  "easy— the good parts can't run away.",
  "flick budget exhausted. take a breath.",
];
export const rushLine = (): string => freshPick(RUSH_LINES);

const RESIZE_LINES = [
  "new window shape~ recalculating nap coordinates.",
  "resize detected. my proportions remain perfect.",
  "bigger canvas, same cat. math checks out.",
  "window: resized. whiskers: recalibrated.",
  "you resized the universe. bold.",
];
export const resizeLine = (): string => freshPick(RESIZE_LINES);

/* ----------------------- section awareness ----------------------- */

const SECTION_POOLS: Record<string, readonly string[]> = {
  work: [
    "project time~ start with the shiny ones.",
    "his work. i've purred on every card.",
    "the demos actually load. i checked. twice.",
    "this is the 'he ships things' section.",
    "case studies below. snacks recommended.",
  ],
  experience: [
    "his story so far~ good growth curve.",
    "recruiters screenshot this part. usually.",
    "every entry is real. i was there for some of it. (napping.)",
    "2nd year, already building banking systems. noted.",
    "the timeline reads well. excellent pacing.",
    "genesis 1.0 hackathon — priority task built under pressure. i supervised.",
    "he built BaseCase, a full stackoverflow clone. answers everywhere.",
    "first year: C, C++, unity physics. foundations like a good box.",
    "dhun started as a folder browser. grew up into a whole player.",
    "the netflix clone was pixel-perfect. even the logos lined up.",
    "his git history reads like a diary. a very disciplined diary.",
  ],
  skills: [
    "the skills shelf~ dusted, aligned, ready.",
    "tools of the trade. he wields all of them.",
    "hover the pills — each links to proof. efficient.",
    "a wide shelf. i nap on the top row.",
    "everything here has receipts. nice.",
  ],
  contact: [
    "want to hire sachin? the form's right here. he replies fast.",
    "this is the part where you say hello. no pressure. (some pressure.)",
    "drop him a message — he actually answers.",
    "fun fact: every message gets read. even 'hi'.",
    "the fastest hire starts 30 seconds from here.",
    "your move. the cat believes in you.",
    "psst— say 'the cat sent you'. he'll smile. probably.",
  ],
};
export const sectionLine = (id: string): string =>
  freshPick(SECTION_POOLS[id] ?? ["ooh, a new corner~"]);

/* the cap: all four home sections seen in one session */
const TOUR_DONE = [
  "tour complete~ stamp: hire him. (that's the whole brochure.)",
  "you saw every section. certificate: yours. verdict: excellent taste.",
  "four for four. the cat watched you grow.",
  "full tour done — the gift shop is the contact form.",
  "you've seen it all. the only button left: send message.",
  "climbed every room. respect. sachin noticed.",
];
export const tourLine = () => freshPick(TOUR_DONE);

/* the footer: arriving at the small print earns one quiet word */
const FOOTER_LINES = [
  "the footer — where credits, links, and one cat live.",
  "down here the urls are short and the vibes are final.",
  "the footer. every journey ends in links.",
  "bottom of the page. the cat was here first.",
  "footer found. the important buttons live below.",
  "you scrolled to the small print. i respect that.",
];
export const footerLine = (): string => freshPick(FOOTER_LINES);

/* sitting on real UI, she names what she's sitting on — the card, the
   heading, the note row — so the perch reads as a recommendation */
const SEAT_ABOUT = [
  "{name} — nap-approved.",
  "sitting on «{name}». it holds.",
  "verdict: «{name}» is cat-compatible.",
  "«{name}» passes the paw test.",
  "this spot on «{name}» is prime real estate.",
  "«{name}» can bear one small cat. tested.",
];
export const seatAbout = (name: string): string =>
  freshPick(SEAT_ABOUT).replace("{name}", clip(name, 40));

/* hovering the cat earns a glance — awake or asleep */
const HOVER_AWAKE = [
  "pet me. i dare you.",
  "hovering is free. petting is priceless.",
  "my tail flicked. that's a compliment.",
  "you're just here for the cat. i respect that.",
  "whiskers up. visitor detected.",
  "a hover! hold still, i'm memorizing you.",
];
const HOVER_ASLEEP = [
  "zzZ... hover gently. i'm counting fish.",
  "your cursor is warm. go away. (stay.)",
  "zzz. petting must be earned. in dreams.",
];
export const hoverLine = (sleeping: boolean): string =>
  freshPick(sleeping ? HOVER_ASLEEP : HOVER_AWAKE);

/* writing a real message, and the moment it flies */
const MESSAGE_POOL = [
  "take your time — good words deserve a nap first.",
  "writing him? short and honest beats long and fancy.",
  "the message matters. the cat takes notes.",
  "almost done? he reads every word. even 'hi'.",
];
export const messageLine = (): string => freshPick(MESSAGE_POOL);

const CELEBRATION = [
  "MESSAGE SENT~ the cat is honored. (there will be purring.)",
  "it flew. sachin's inbox just got a good day.",
  "sent! now we wait. i'm excellent at waiting.",
  "brave. you actually hit send. respect + hearts.",
  "the form purrs. message delivered. hire energy incoming.",
  "off it goes~ watch for a reply before your next scroll.",
];
export const celebrationLine = (): string => freshPick(CELEBRATION);

/* a second (or third...) distinct post = actual reader */
const POST_STREAK = [
  "another post~ reader detected. sachin writes for people like you.",
  "two posts deep. the vault approves.",
  "you're actually reading. that's rare. and lovely.",
  "the blog has 330 notes. pace yourself. (or don't.)",
  "a second helping of notes. the cat plates more.",
  "studying, are we? he'd hire that energy.",
];
export const streakPostLine = (): string => freshPick(POST_STREAK);

const PALETTE_OPEN = [
  "the command palette. everything sachin wrote, one key away.",
  "`/` opens this too. we share custody of it.",
  "try `blog` or `graph` in there. `contact` if you're brave.",
  "cmd+k on mac, ctrl+k elsewhere. i checked both.",
  "search box: online. typing required, judgement optional.",
];
export const paletteLine = (): string => freshPick(PALETTE_OPEN);

const HELP_OPEN = [
  "the `?` sheet. i taught it everything i know.",
  "that's my curriculum. escape closes the school.",
  "`g` then `h` is home, `g` then `b` is blog. smooth moves.",
  "shortcuts listed. half of them are just me.",
  "help open. `t` flips the theme while you're in there.",
];
export const helpLine = (): string => freshPick(HELP_OPEN);

const SELECTION_POOL = [
  "reading closely. i respect a close read.",
  "so much text selected. thesis mode: on.",
  "highlighting. sachin's words, your pen.",
  "that's a paragraph and a half. bold crop.",
  "select-all is a compliment. i'll take it.",
];
export const selectionLine = (): string => freshPick(SELECTION_POOL);

const FOCUS_LINES = {
  name: [
    "the name field. yours, ideally.",
    "names: the original primary keys.",
    "type it like you mean to be remembered.",
  ],
  email: [
    "the email field. where replies live.",
    "an email a day keeps the silence away.",
    "that's the one sachin actually checks.",
  ],
  message: [
    "the message box. rambling is allowed.",
    "say hi, say hire, say anything really.",
    "draft mode: the cat is listening.",
  ],
} as const;
export type FocusField = keyof typeof FOCUS_LINES;
export const focusLine = (field: FocusField): string =>
  freshPick(FOCUS_LINES[field]);

const FORM_INVALID_LINES = [
  "required means required. even cats know.",
  "the fields turned red. bold choice — fill them?",
  "name, email, message. one's missing. i checked.",
  "validation says hi. again, but with text? ♥",
  "red underline = the love language: required.",
];
export const formErrorLine = (): string => freshPick(FORM_INVALID_LINES);

const G_ARMED = [
  "g is armed. g h home, g b blog, g p graph.",
  "vim brain detected. g g takes you to the top.",
  "prefix mode. the next key decides your fate.",
  "g pressed. choose wisely: h, b, p, c, g.",
];
export const gArmedLine = (): string => freshPick(G_ARMED);

const PRINT_POOL = [
  "printing? ink is just pixel sweat.",
  "paper mode. the DOM goes offline.",
  "a printout. framed, hopefully. or fridge-worthy.",
];
export const printLine = (): string => freshPick(PRINT_POOL);

const RAPID_NAV = [
  "three hops in a blur. speed-running the portfolio.",
  "zooming. pick a page, any page.",
  "who needs a sitemap when you have momentum.",
  "link-clicking cardio. sachin approves.",
  "slow down... or don't. i can keep up.",
];
export const rapidLine = (): string => freshPick(RAPID_NAV);

const TAB_LINES = [
  "tab tab tab. keyboard tour detected.",
  "focus rings: my favorite jewelry.",
  "no mouse? bold. i respect it.",
  "the tab key and i: same rhythm.",
  "tab further. the contact form is south.",
];
export const tabLine = (): string => freshPick(TAB_LINES);

const RUSH_UP = [
  "rewinding. the plot thickens in reverse.",
  "up! against gravity. impressive.",
  "scrolling up fast: regret or revision?",
  "back to the top. classic cat u-turn.",
  "reverse gear engaged. purr-fect parallel parking.",
];
export const rushUpLine = (): string => freshPick(RUSH_UP);

const SELECT_ALL = [
  "the whole page? ambitious. i approve.",
  "ctrl+a. the nuclear option.",
  "everything, at once. very inclusive.",
  "select-all detected. maximum context.",
  "you selected the source. i saw everything.",
];
export const selectAllLine = (): string => freshPick(SELECT_ALL);

const REPEAT_LINES = [
  "that's three clicks on the same thing. it's a link, not a button.",
  "clicking harder doesn't load it faster. (it does not.)",
  "obsessive. i respect it. the target is fine.",
  "three times a charm. you're at three. stop, or don't.",
  "same target, same energy. it heard you the first time.",
];
export const repeatLine = (): string => freshPick(REPEAT_LINES);

const BUBBLE_COPY = [
  "you copied me. i'm flattered and mildly concerned.",
  "clipboard: cat edition.",
  "i knew i was quotable.",
  "pasting that on your resume? bold.",
  "you can pet me with words now.",
];
export const bubbleCopyLine = (): string => freshPick(BUBBLE_COPY);

const JIGGLE_LINES = [
  "the mouse has the zoomies too.",
  "wiggle detected. same energy, smaller scale.",
  "is the cursor okay? should i fetch it? (i don't fetch.)",
  "jiggling: the human equivalent of chasing yarn.",
  "shake it off. that's what the pointer said.",
];
export const jiggleLine = (): string => freshPick(JIGGLE_LINES);

const ESCAPE_LINES = [
  "escape: the universal undo. mood.",
  "esc pressed. nothing happened. peaceful.",
  "escape hatch: armed. (nothing to escape yet.)",
  "the escape key and naps: both coping mechanisms.",
];
export const escapeLine = (): string => freshPick(ESCAPE_LINES);

const FOUR_OH_FOUR = [
  "wrong door. the cat opens it anyway.",
  "404. i looked under the sofa too. nothing.",
  "you've reached nowhere. lovely decor, though.",
  "this page exists in a parallel repo.",
  "error 404: treat not found. check the kitchen.",
];

/* keeping her distance: the graph canvas, a highlighted passage */
const OBSERVE_LINES = [
  "i'll watch the graph from right here. you drive.",
  "so many edges~ paws off the canvas.",
  "graph mode: safe distance, full attention.",
  "the vault is yours. i supervise from the rim.",
  "nodes everywhere. spectating from the edge.",
  "one tab, one graph, one very distant cat.",
  "i'll stay where the zoom doesn't reach.",
];
const BACK_LINES = [
  "easy, i can read it fine from here.",
  "highlight away~ i'll keep my whiskers back.",
  "you select, i observe. good system.",
  "the text is yours. i've got the overview.",
  "step back? done. take your time.",
  "highlighting is a solo sport. i'll spectate.",
  "words yours, whiskers mine. deal.",
];
export const standoffLine = (kind: "observe" | "back"): string =>
  freshPick(kind === "observe" ? OBSERVE_LINES : BACK_LINES);

/* ...and the mirror: once the reason to step back is gone */
const CLOSE_IN_LINES = [
  "understood~ back in close.",
  "selection dropped. come closer, it's fine.",
  "overlays away. personal space reverts to normal.",
  "field done? i'll hover again. briefly.",
  "the words are cool again.",
];
export const closeInLine = (): string => freshPick(CLOSE_IN_LINES);

/* known routes get their pools; anything else is a lost page */
export const isKnownPath = (path: string): boolean => {
  const p = path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
  return p === "/" || p === "/blog" || p === "/graph" || p.startsWith("/blog/post");
};

/* ------------------ weird-behaviour reactions ------------------ */

export type TapKind = "wake" | "many" | "melt" | "ctx" | "purr";

const TAP_LINES: Record<TapKind, readonly string[]> = {
  wake: [
    "eek— you clicked a sleeping cat. bold.",
    "hmph. i was dreaming of green builds.",
    "disturbing a professional napper. noted.",
    "you poke, i wake. that's the treaty.",
    "i WAS sleeping. now i'm watching you. kindly.",
  ],
  many: [
    "steady~ one cat, many taps.",
    "why do you keep clicking me? (don't stop.)",
    "i'm not made of treats. tap again and find out.",
    "that's five. i'm counting. cats count.",
    "okay okay— i'm RIGHT here. seen?",
    "my tail is getting dizzy from all this.",
  ],
  melt: [
    "ZOOM. you asked for it. (you tapped for it.)",
    "that's it— i'm going. (across the screen. i'll be back.)",
    "meltdown complete. purr system restarting...",
    "seven taps. i have FEELINGS.",
    "employee morale: shaken. pets required immediately.",
  ],
  ctx: [
    "right-clicking the cat. bold. (do it again.)",
    "context menu: pet, treat, hire sachin — all valid options.",
    "that's myContextMenu. thank you kindly.",
    "you brought up MY menu. impressive.",
  ],
  purr: [
    "purr... okay, you may stay.",
    "held me down and patted. bold strategy. it worked.",
    "a long press of affection. cat-approved.",
    "this. exactly this. hold it.",
  ],
};
export const tapLine = (kind: TapKind): string => freshPick(TAP_LINES[kind]);

const MORNING = [
  "morning. i've been up since the build.", "sunrise detected. bowls refilled (in spirit).",
  "morning person? no. morning cat? absolutely.", "dawn patrol begins. tip: hydrate first.",
  "the light is doing that thing on the floor. mine now.", "early bird? i'm the cat who lets it happen.",
  "good morning. the bugs are still sleepy.", "first light. first commit. first nap. (in some order).",
  "coffee for you, sunlight for me.", "the morning has excellent nap potential.",
  "you're awake. i'm impressed. gently.", "breakfast energy: focused and slightly chaotic.",
];
const AFTERNOON = [
  "afternoon lull? i call it efficiency.", "the sun moved. i'll follow it later.",
  "post-lunch scroll. classic.", "afternoon. everything is a little softer.",
  "peak nap hours approach.", "the light is flat now. still nap-able.",
  "midday. deploys feel braver here.", "i've napped twice since you started. status: relaxed.",
  "lunch was good. i had imaginary fish.", "the afternoon purrs quietly.", "screen at 2pm hits different. blink often.",
  "this is the hour of the small stretch.",
];
const EVENING = [
  "evening~ the lamps are on.", "golden hour for cats and code.", "dinner soon? for you, i mean. (i never say).",
  "the day winds down. the tabs multiply.", "evening energy: cozy, judgmental, warm.", "dusk. my second shift begins.",
  "you made it through the day. i mostly napped. team effort.", "evening purr o'clock.",
  "put the kettle on. i'll supervise.", "the screen glows softer now. nicer for whiskers.", "wrap-up mode: engaged.",
  "night shift loading. almost.",
];
const NIGHT = [
  "still awake? the build can wait. probably.", "3am thoughts are just code reviews by moonlight.",
  "the house is quiet. my opinions are not.", "night mode: maximum purr.", "go on, one more scroll. then bed.",
  "insomnia or ambition? with you, hard to say.", "the moon is out. so is my judgment. kindly.",
  "late night commit? brave. hydrate.", "the night is young and so is this page (sort of).",
  "everyone's asleep except us and the ci pipeline.", "purr past midnight.", "the stars are just open tabs.",
  "sleep is a suggestion. a good one though.", "quiet hours: typing gently, judging softly.", "one more thing before bed: water.",
];

export const timeLine = (ctx: CatContext): string => {
  const h = ctx.hour;
  if (h >= 0 && h < 6) return freshPick(NIGHT);
  if (h < 12) return freshPick(MORNING);
  if (h < 18) return freshPick(AFTERNOON);
  return freshPick(EVENING);
};

const SCROLL_MID = [
  "halfway there~ the good part is below.", "you're 45% in. i can feel it.",
  "keep scrolling. i believe in momentum.", "mid-page. the sweet spot of curiosity.",
  "the middle is where cats judge best.", "progress detected. purr approved.",
];
const SCROLL_END = [
  "bottom reached. gg.", "the end! or as cats call it: the sunbeam.",
  "you made it. i'm lightly emotional.", "footer achieved. respect.",
  "that's the whole page. i checked twice.", "full scroll. full purr.",
];

export const scrollLine = (depth: "mid" | "end"): string =>
  freshPick(depth === "mid" ? SCROLL_MID : SCROLL_END);

const COPY_LINES = [
  "copied. originality is a myth (cite the cat).", "ctrl+c detected. the classic move.",
  "good paste. i saw nothing. trust.", "clipboard: corrupted with knowledge.",
  "take it. it's yours now. (send fish).", "to copy or not to copy. you chose correctly.",
  "clippy who? i saw that.", "stash it in your notes. i won't tell.",
];
export const copyLine = () => freshPick(COPY_LINES);

const FAST_TYPER = [
  "slow down, i blink in wpm.", "your keys are doing zoomies.", "tap tap tap. poetry or panic?",
  "five keys a second. i can't even open a can that fast.", "typing like the build is watching. it is.",
  "hot keys, cool cat.", "i chase mice, you chase words. we're the same.",
];
const SLOW_TYPER = [
  "thoughtful typing. i respect a slow paw.", "one key at a time. luxury.", "hesitation detected. or maybe poetry.",
  "you type like sunbeams arrive: eventually.", "the pause between keys? i nap in it.",
];
export const typingLine = (fast: boolean): string => freshPick(fast ? FAST_TYPER : SLOW_TYPER);

const THEME_EXTRA = {
  dark: ["nya~ dim lights. big naps.", "dark mode = cat mode.", "the pixels went quiet. i like it.", "night vision: engaged.", "dark themes and warm keyboards. life is good.", "less glare, more purr."],
  light: ["so bright! but cute.", "sunlight detected~", "everything's visible. even my judgment.", "light mode: bold choice, respect.", "the whites are so white. i might need sunglasses.", "day shift: activated."],
};
export const themeLine = (dark: boolean): string => {
  const pool = dark
    ? [...THEME_EXTRA.dark, ...THEME_LINES.dark]
    : [...THEME_EXTRA.light, ...THEME_LINES.light];
  return freshPick(pool);
};

const RETURN_LINES = [
  `${CAT_NAME} missed you.`, `${CAT_NAME} is back.`, `pspsps… oh— hi. it's ${CAT_NAME}.`,
  `you left. i napped. coincidence? ${CAT_NAME}.`, `welcome back. i kept the cursor warm. (${CAT_NAME})`,
  `the porch light stayed on. obviously. — ${CAT_NAME}`, `where were you? never mind. ${CAT_NAME} forgives.`,
  `back so soon? i barely finished one nap. ${CAT_NAME} welcomes you.`, `i waited by the edge of the screen. ${CAT_NAME} always does.`,
  `round two? ${CAT_NAME} is ready.`, `you're here. the naps can wait. (${CAT_NAME})`,
  `i told the other tabs you'd return. — ${CAT_NAME}`, `session resumed, purr restored. ${CAT_NAME}.`,
  `i kept one eye open. just one. ${CAT_NAME}.`, `home again, says ${CAT_NAME}.`,
];
export const returnLine = () => freshPick(RETURN_LINES);

const WAKE_POOL = [...WAKE_LINES,
  "i was not sleeping. i was processing.", "hm? oh— hi.", "awake. technically always.",
  "blinks slowly. judges softly.", "yawn~ that was a power nap.", "caught me. or didn't.",
  "the nap had layers.", "i'm up, i'm up. ish.", "processing... done. hi.",
  "dreamt you shipped something. did you?", "nap complete. batteries: 98%.",
  "who dares. oh. hello.", "i was meditating. cat style.", "the floor was warm. it was a business nap.",
  "awake now. continue, i'm listening.", "one eye open. that's a full cat work mode.",
  "i heard a keyboard. instinct.", "warm spot: abandoned. for you. briefly.",
  "the nap ends where you begin.",
];
export const wakeLine = () => freshPick(WAKE_POOL);

const PET_POOL = [...PET_LINES,
  "you have the gentlest cursor.", "right behind the ears. yes. that.", "purr engine: started.",
  "careful, i'll fall asleep on your hand.", "that. exactly that. don't stop.", "affection detected. reciprocating.",
  "soft hands. good human.", "i permit this. enthusiastically.", "again. differently this time.",
  "you know the way to a cat's heart. it's pets. it was always pets.", "slow blink: returned.",
  "i'm going to purr now. it's unavoidable.", "pet quota: exceeded. keep going.",
  "one more. for the road.", "you're hired. position: petter.", "the purr is involuntary. blame yourself.",
  "i've decided we're friends. it's official.", "head pat received. tail flick: approval.",
  "if affection were a commit, this would be a merge.", "warm hands, warm heart, warm lap.",
  "cats don't beg. we just... wait. like this.", "you passed the test. there was no test.",
  "gentle. precise. i approve.", "this is better than fish. almost.", "i'm going to remember this paw-shaped kindness.",
  "petting the cat boosts build morale by 34%. science (mine).", "ears forward: joy.",
  "i'll purr you a lullaby later.", "the good kind of interruption.", "you found the exact pixel.",
  "okay one more and i— yes that one.", "unlimited pets detected. the system holds.",
  "i vibrate now. this is normal.", "friendship: deepening...", "you're on the approved list. permanently.",
  "my bones are made of trust now.", "that spot is reserved for you always.", "purr. purr. purr. (that's the whole message).",
  "if you stop i'll simply start judging again.", "the ancient art of: cat on hand.", "consider me emotionally compromised.",
];
export const petLine = (pets: number): string => {
  if (pets > 0 && pets % 10 === 0) {
    const milestones = [
      `${pets} pets. ${CAT_NAME} approves.`,
      `${pets} pets deep. i'm legally yours now.`,
      `${pets} pets. the record books will remember.`,
      `milestone: ${pets} pets. ceremony: naps.`,
      `${pets} pets and not one regret. — ${CAT_NAME}`,
    ];
    return freshPick(milestones);
  }
  return freshPick(PET_POOL);
};

const TREAT_POOL = [
  "nom nom~", "fish!! my favorite.", "crunchy. ♥", "a feast! for me? finally.",
  "the good stuff. i forgive everything now.", "gulps politely. demands more.", "five stars. would nom again.",
  "i was saving room. apparently not.", "delicious. the texture of trust.", "between us: this is why i stay.",
  "the crunch heard round the world.", "best moment of my nine lives (this one).", "i accept this offering.",
  "chef's kiss. with whiskers.", "you may continue petting. i'm busy chewing.", "salted perfectly. i can taste the affection.",
  "another? don't mind if i do. ♥", "the fish represents my approval of you.", "snack attack: successful.",
  "i'll share. (i won't).", "purrs with mouth full. rude. adorable.", "this fish had a family. delicious family.",
  "i'm suspiciously happy now.", "okay. we're best friends. it's official. dinner sealed it.",
];
export const treatLine = () => freshPick(TREAT_POOL);

/* ------------------------------ templates ------------------------------ */

const templatePools = [TOPICS, VERBS, TAILS, ADJ] as const;

const TEMPLATES: (() => string)[] = [
  () => `i ${pick(VERBS)} ${pick(TOPICS)} ${pick(TAILS)}`,
  () => `${pick(TOPICS)} is ${pick(ADJ)} energy.`,
  () => `dreamt about ${pick(TOPICS)} ${pick(TAILS)}`,
  () => `${pick(TOPICS)}? ${pick(ADJ)} until proven otherwise.`,
  () => `rating ${pick(TOPICS)}: ${pick(["9.7", "solid", "mid", "nap-approved", "orange", "void", "ships", "purr/10", "chef", "goat", "11/10", "beta"])}/10 — ${pick(TAILS)}`,
  () => `fun fact: ${pick(FACTS)}`,
  () => `if ${pick(TOPICS)} were a cat, it would be ${pick(ADJ)}.`,
  () => `today i ${pick(VERBS)} ${pick(TOPICS)} ${pick(TAILS)}`,
  () => `${pick(TOPICS)}: ${pick(ADJ)}, honestly.`,
  () => `a haiku-ish thought: ${pick(TOPICS)}, ${pick(ADJ)}, ${pick(["and a nap.", "whiskers.", "pure trust.", "one small commit.", "the long purr."])}`,
];

/**
 * Number of unique strings reachable from the templates — the "1000s of
 * messages" guarantee (conservative: products of the core slot banks).
 */
export const ESTIMATED_LINE_SPACE =
  TOPICS.length * VERBS.length * TAILS.length + // T1
  TOPICS.length * ADJ.length * 4 + // T2/T4/T8/T9-ish
  TOPICS.length * TAILS.length * 2 + // T3 + templates sharing tails
  TOPICS.length * FACTS.length +
  TOPICS.length * ADJ.length +
  TOPICS.length * 12 +
  OBSERVATIONS.length + GUIDE_LINES.length + WISDOM.length + FACTS.length +
  PET_POOL.length + TREAT_POOL.length + WAKE_POOL.length + RETURN_LINES.length +
  PREDICTIONS.length * 3 + COPY_LINES.length + SCROLL_MID.length + SCROLL_END.length +
  MORNING.length + AFTERNOON.length + EVENING.length + NIGHT.length +
  Object.values(ROUTE_POOLS).reduce((n, p) => n + p.length, 0) +
  Object.values(CLICK_POOLS).reduce((n, p) => n + p.length, 0) +
  Object.values(SECTION_POOLS).reduce((n, p) => n + p.length, 0) +
  Object.values(TAP_LINES).reduce((n, p) => n + p.length, 0) +
  Object.values(KEYWORD_LINES).reduce((n, p) => n + p.length, 0) +
  TOUR_DONE.length + HOVER_AWAKE.length + HOVER_ASLEEP.length +
  MESSAGE_POOL.length + CELEBRATION.length + POST_STREAK.length +
  PALETTE_OPEN.length + HELP_OPEN.length + SELECTION_POOL.length +
  FOCUS_LINES.name.length + FOCUS_LINES.email.length +
  FOCUS_LINES.message.length + FORM_INVALID_LINES.length + G_ARMED.length +
  PRINT_POOL.length +
  RAPID_NAV.length + TAB_LINES.length + RUSH_UP.length + SELECT_ALL.length +
  REPEAT_LINES.length + BUBBLE_COPY.length + FOUR_OH_FOUR.length +
  ABSENT_SHORT.length + ABSENT_LONG.length + RUSH_LINES.length + RESIZE_LINES.length +
  OBSERVE_LINES.length + BACK_LINES.length + CLOSE_IN_LINES.length +
  POST_LINES.length + GENERIC_ROOMS.length + CHATTER.length +
  LANDED.length + FAMILIAR.length + FOOTER_LINES.length + SEAT_ABOUT.length;

export const templateLine = (): string => build(pick(TEMPLATES));

export const factLine = (): string => build(() => `fun fact: ${pick(FACTS)}`);
export const wisdomLine = (): string => build(() => pick(WISDOM));
export const observationLine = (): string => build(() => pick(OBSERVATIONS));
export const guideLine = (): string => build(() => pick(GUIDE_LINES));

/** smart chatter: mixes context-aware pools with template explosions */
export const chatterLine = (ctx: CatContext): string => {
  const roll = Math.random();
  if (roll < 0.22) return routeOrTimeLine(ctx);
  if (roll < 0.34) return templateLine();
  if (roll < 0.44) return factLine();
  if (roll < 0.56) return wisdomLine();
  if (roll < 0.68) return guideLine();
  if (roll < 0.78) return observationLine();
  if (roll < 0.86) return freshPick(CHATTER);
  if (roll < 0.93 && ctx.scrollPct > 40) return scrollLine(ctx.scrollPct > 90 ? "end" : "mid");
  return typingLine(ctx.keyRate >= 6);
};

export const routeOrTimeLine = (ctx: CatContext): string => {
  const roll = Math.random();
  if (roll < 0.45) return routeLine(ctx.path, ctx);
  if (roll < 0.8) return timeLine(ctx);
  if (ctx.keyRate >= 6) return typingLine(true);
  if (ctx.keyRate > 0 && ctx.keyRate <= 2) return typingLine(false);
  return timeLine(ctx);
};

/* -------------------------------- acts -------------------------------- */

export type ActId =
  | "zoomies" | "yarn" | "stare" | "groom" | "knock" | "loaf"
  | "chirp" | "dance" | "hide" | "stats" | "prophecy" | "stretch"
  | "deep" | "audit" | "seat" | "prey"
  | "scratch" | "spin" | "sneeze" | "butterfly" | "flop" | "paw"
  | "sunbeam" | "laser" | "pounce" | "dig" | "box" | "tailchase"
  | "social" | "roll" | "playbow" | "dust" | "gift";

interface ActDef {
  id: ActId;
  weight: number;
  line: (ctx: CatContext) => string;
}

const statsLine = (ctx: CatContext): string => {
  const patterns = [
    `session report: ${ctx.visits} rooms, ${ctx.pets} pets, ${ctx.scrollPct}% scrolled. verdict: good.`,
    `status: ${ctx.visits} routes walked, purring at optimal levels.`,
    `log: ${ctx.pets} pets logged, ${ctx.visits} rooms inspected. no bugs (i ate them).`,
    `metrics: visits=${ctx.visits} pets=${ctx.pets} scroll=${ctx.scrollPct}% cat=mood:excellent`,
    `dashboard: everything is fine. i checked. ${ctx.visits} times.`,
    `summary of you so far: curious, ${ctx.pets >= 3 ? "generous" : "cautious"}, ${ctx.scrollPct}% committed.`,
    `uptime: this visit. quality: purr. rooms toured: ${ctx.visits}.`,
    `${ctx.pets} pets in, ${ctx.visits} rooms out, zero complaints filed.`,
  ];
  return freshPick(patterns);
};

/* stats lines are generated live from context (see statsLine / ACT_DEFS) */
const ACT_LINES: Omit<Record<ActId, readonly string[]>, "stats"> = {
  zoomies: ["ZOOM.", "zoomies. mathematically necessary.", "gotta go— nowhere in particular.", "fast mode: ON.", "the floor is lava. i am speed.", "sprint testing my own legs.", "zoom interval scheduled. please stand clear.", "lap number one. there will be more.", "testing the floor's sprint rating. scientific."],
  yarn: ["yarn detected. initiating pursuit.", "the yarn moves. i must follow physics.", "round and round. this is cardio.", "behind you! (there's nothing. pretend).", "pounce protocol: engaged.", "i could NOT chase this. (i will)."],
  stare: ["staring at the wall. it owes me answers.", "the wall just said something interesting. you had to be there.", "i see movement. (i don't). professional habit.", "contemplating the void. the void is beige.", "deep thoughts. don't interrupt.", "the wall confessed everything."],
  groom: ["*aggressively grooms one paw*", "grooming: essential maintenance.", "must look impeccable for the DOM.", "one paw down, seven to go. (i have four, focus).", "professional grooming break.", "hair out of place? impossible. but checking."],
  knock: ["gravity test #487. successful.", "that fell. i was nearby. coincidence.", "physics demonstration, unrequested.", "i didn't push it. i *suggested* it move.", "objects exist to be nudged. gently. or not.", "the shelf had it coming."],
  loaf: ["loaf mode: engaged.", "bread cat: risen.", "paws tucked. unavailable until further notice.", "i am a loaf. a judgmental loaf.", "tucking in. do not perceive me.", "croissant position: locked."],
  chirp: ["chirp chirp. (there was a bird. imaginary).", "window bird report: one (1) pigeon, fictional.", "the birds don't exist here. i chirp anyway.", "tiny warble at the void.", "bird detected at... nope, gone. good run though.", "my inside voice: chirp."],
  dance: ["one hop, two hop, tail flip.", "dance break. cats have rhythm (i do).", "♪ ...i mean: ~woosh~.", "wiggles. then business.", "the pitter-patter of purpose.", "i call this move: 'the deploy'.", "back and forth. side to side. purr."],
  hide: ["*hides behind the text* ...peek.", "stealth mode. you can't see me. (you can).", "i am one with the whitespace.", "hidden in plain sight. classic.", "vanishing act. encore later.", "behind the paragraphs. the safest place."],
  prophecy: ["i see the future. it's scroll-shaped.", "reading the yarn again...", "one prediction, fresh from the oven.", "the whiskers twitch. destiny approaches.", "fortune: one (1) event, imminent."],
  stretch: ["*big stretch* full length achieved.", "stretching the spoooone.", "yawn to the back of my skull. behold.", "limber. ready. mostly.", "paws forward, bum up. the classic.", "engineering my own pretzel."],
  deep: ["fun fact: the purr heals bones. i'm basically healthcare.", "thought: every tab is a door, every door a sunbeam.", "the answer is simpler: nap on it.", "what if the code compiled us?", "small thought: kindness ships faster than urgency.", "somewhere, a build is green. i can feel it.", "meaning of life: warm spot, good friends, few tabs.", "if it matters, do it slowly. like napping."],
  audit: ["audited the DOM. 1 cat, 0 bugs (fixed mentally).", "code review: passed with purrs.", "scanning... scanning... approved.", "checked every corner. quality: acceptable.", "the sitemap smells fine.", "inspected the source. bold choices. i allow them.", "lint complete: you, but cute. passes."],
  seat: ["claiming this spot. it's mine now.", "sitting on important paperwork. (the button).", "quality assurance: i sit directly on it.", "if i fits, i sits. it fits.", "this spot needed supervision. i am supervision.", "hovering is for birds. i commit fully.", "the send button is now a cat bed. emails still work.", "i sit where the clicks happen. power position.", "professional seat tester: this button passes.", "form? checked. button? sat on. you may proceed."],
  prey: ["mouse detected. initiating pursuit.", "something moved. chasing first, thinking later.", "hunt mode: whiskers forward, brain off.", "prey spotted. its chances: low.", "the chase: ancient, sacred, zoomy.", "i saw it. i want it. i'm going.", "the mouse thinks it's fast. adorable.", "whiskers: locked. dignity: gone. going in."],
  scratch: ["sharpening claws on your cards. tasteful.", "this card had excellent grain for scratching.", "manicure station: located.", "claws: filed. card: sorry-er.", "sisal? never met her. fabric works.", "scratch test: material passes. my claws: harder.", "the DOM can take it. mostly.", "filing these claws for the algorithm."],
  spin: ["spin cycle: complete.", "twirl engaged — tail as axis.", "900 degrees of flourish. nailed it.", "spinning: the zoomies, but vertical.", "dizzy? never heard of her.", "one pirouette. hold the applause.", "round and round — confirming the tail is still attached.", "rotational velocity: showoff."],
  sneeze: ["a-choo. pollen in the pixels.", "sneeze: deployed. dignity: recovering.", "achoo! something in the build smells new.", "blessed me. you're welcome.", "sneeze velocity: release-candidate.", "the dust bunnies know I'm here now.", "tiny sneeze. enormous drama.", "achoo — that one had a stack trace."],
  butterfly: ["butterfly! priorities reassigned.", "winged intruder detected. chasing politely.", "it floats. i shall float after it.", "butterfly diplomacy: follow it everywhere.", "shiny wing. brain: off.", "the butterfly knows something. tail first, questions later.", "flutter, chase, repeat.", "winged consultant inbound. attending now."],
  flop: ["flop. (play dead. Oscar pending.)", "dead. until dinner.", "dramatic collapse #3 — reviews are in.", "i have perished. tell no one.", "floor suddenly delicious. lying here now.", "simulate failure: succeeded.", "nose up, paws out, vibes: expired (temporarily).", "system halt: cat.exe crashed (on purpose)."],
  paw: ["boop incoming.", "paw: deployed at your cursor.", "your pointer owes me a high five.", "swat! (affectionate).", "cursor patrol: swatting round two.", "giving your mouse a high five. it's shy.", "paws on deck — cursor spotted.", "tat-tat-tat. (that's paw for hello)."],
  sunbeam: ["found a sunbeam. claiming it.", "solar charging: 40%.", "warm rectangle detected. relocating.", "photosynthesis, but make it cat.", "this patch of light is my office now.", "sunbeam secured. do not disturb (do disturb, i dare you).", "vitamin d: absorbed. dignity: also."],
  laser: ["red dot. RED DOT.", "the dot knows everything. chasing it anyway.", "laser acquired. laws of physics: suspended.", "almost had it. it is intangible. irrelevant.", "that dot is guilty of something.", "cornered it. it teleported. classic.", "i will catch the light. someday.", "the dot mocks me. i will mock gravity back."],
  pounce: ["butt wiggle charging... launch.", "stalk mode: knees bent, brain off.", "pounce incoming. stand clear (or don't).", "the wiggle is load-bearing.", "target locked. leaping with my whole heart.", "gravity is optional for the next second.", "pounce: deployed with maximum commitment."],
  dig: ["digging. treasure maybe. vibes definitely.", "archaeology mode: unearthing treats.", "this spot hides something. my instincts say snacks.", "paws: digging. plans: none.", "cat excavation site. hard hat optional.", "found nothing. dug again. science.", "burying my secrets. (there are none. yet.)"],
  box: ["a BOX. plans canceled.", "cardboard acquired. i live here now.", "if i fits (i do), i sits.", "the box chose me. mostly. okay, i chose it.", "shipping label: return to sender (me, inside).", "box: occupied. knock later.", "new apartment. rent: one purr.", "assembles box. refuses to elaborate."],
  tailchase: ["tail detected. engaging.", "round and round — it's always one step ahead.", "my tail has opinions. negotiating via orbit.", "chase protocol: self.", "almost bit it. the tail is swift.", "orbiting my own tail. very professional.", "the tail starts it. i finish it. (i don't.)"],
  social: ["the links deserve attention. assigning myself.", "ambassador duty: escorting you to the socials.", "this button hasn't been clicked in 4 seconds. scandalous.", "i sat on the good links. follow me to them.", "internet doors: right here. after you.", "psst — github's shiny today.", "click something unexpected. i'll comment."],
  roll: ["rolling. floor: excellent.", "full barrel roll, zero g's.", "back down here: maximum stretch achieved.", "rolling: the cute protocol demands it.", "one roll, please. and another.", "gravity check #2: still friendly.", "fur: tousled. dignity: intact."],
  playbow: ["play bow! your move.", "front down, bum up — the invitation stands.", "wanna go? i wanna go.", "pose: maximum 'chase me'.", "this stance means fun. translation: follow me.", "tail up, elbows down. game on."],
  dust: ["dust bunny spotted. engaging.", "it moved. it's mine. (it's dust.)", "batting at the invisible. professional.", "the speck chose chaos. so did i.", "invisible prey: the hardest prey.", "paw: three o'clock. target: lint."],
  gift: ["bringing you something. hold on.", "a star, for you. don't drop it.", "gift delivery service: one sparkle.", "i fetched it from the sky. you're welcome.", "present! (it's shiny. it's yours. briefly.)", "accept this star as tribute.", "delivery complete. tip in pets."],
};

/** prey outcomes — spoken when the chase ends (or doesn't) */
export const PREY_RESULT = {
  catch: ["got it.", "caught. trophy: none, released humanely.", "mine. briefly.", "the hunt concludes. purr."],
  escape: ["it escaped. (dramatic pause).", "freed it. i'm merciful like that.", "spared. it looked busy."],
} as const;

export const preyResult = (kind: keyof typeof PREY_RESULT): string =>
  freshPick(PREY_RESULT[kind]);

/* a frantic cursor gets one friendly word — sustained speed, not flicks */
const SPEED_LINES = [
  "woah — slow down, this is a portfolio, not a racetrack.",
  "zoomies are MY department. pace yourself.",
  "your cursor just did a 100m dash. hydrate.",
  "whiplash detected. the content isn't going anywhere.",
  "speeding? the good stuff rewards scrolling, not sprinting.",
  "i can barely keep up, and i have four legs and a whole engine.",
  "pixel treadmill: off. enjoy the walk.",
];

export const speedLine = (): string => freshPick(SPEED_LINES);

/* double-click on her: a high five (or a batslap, depending on the day) */
const HIGH_FIVE_LINES = [
  "high five! (paw delivered.)",
  "double-click: the cat chose contact.",
  "boop right back at you.",
  "you petted with style. noted.",
  "that's two clicks — legally a high five now.",
  "paw handshake complete. friendship extended.",
  "again! (affection has no rate limit.)",
];

export const highFiveLine = (): string => freshPick(HIGH_FIVE_LINES);

/* ------------------- link encouragement (hover) ------------------- */

/* hovering a link worth exploring earns a nudge — distinct from the
   click lines (those fire when the click actually lands) */
export type EncourageKind =
  | "github" | "social" | "email" | "blog" | "graph" | "contact" | "demo";

const ENCOURAGE_LINES: Record<EncourageKind, readonly string[]> = {
  github: [
    "hovering github? the door's open — go on.",
    "his commits are friendly. say hi to them.",
    "that's the repo button. it approves of curiosity.",
    "stars are free. he pretends not to count. (he counts.)",
  ],
  social: [
    "the socials are down there. he actually posts.",
    "a good scroll includes clicking things.",
    "curiosity: click it. that's the whole tutorial.",
    "that link knows where he is. follow it.",
  ],
  email: [
    "the mailto hovers nearby. he replies fast.",
    "your pointer's over the inbox. fate?",
    "compose a note — the cat guarantees a reply. (legally not binding.)",
    "inbox's looking hopeful. teach it something.",
  ],
  blog: [
    "the blog holds 300+ notes. pick one.",
    "reading list: loaded. curiosity: required.",
    "his notes, raw and unfiltered. dive in.",
    "somewhere in there is a note about me. probably.",
  ],
  graph: [
    "the graph is prettier in motion. visit it.",
    "330 nodes are waiting for a wander.",
    "the knowledge graph: his favorite flex.",
    "drag it, spin it, get lost. i'll wait.",
  ],
  contact: [
    "the form's right there. words work too.",
    "he reads every message. cats verify.",
    "type something nice. or anything. he's not picky.",
    "three fields stand between you and his inbox.",
  ],
  demo: [
    "the live demo. it loads. i checked. twice.",
    "go on — press the shiny deployed thing.",
    "that one runs in production. brave, that link.",
    "the demo's up. it never sleeps. neither do i, officially.",
  ],
};

export const encourageLine = (kind: EncourageKind): string =>
  freshPick(ENCOURAGE_LINES[kind]);

/* she names the actual thing under the pointer — the project's title
   from its card, the note's filename, a tech pill's label — so the
   nudge reads as knowledge of the site, not a generic toast */
const ENCOURAGE_ABOUT: Record<EncourageKind, readonly string[]> = {
  github: [
    "{name} — the door's open. go on.",
    "{name}'s commits are friendly. say hi to them.",
    "that's {name}. he'd want you to see it.",
    "stars are free — {name} pretends not to count. (it counts.)",
    "{name} is where the code lives. i've napped in the diffs.",
  ],
  social: [
    "the {name} link knows where he is. follow it.",
    "{name}? he actually posts there.",
    "curiosity approved: {name}. click it.",
    "a discerning pointer — {name} it is.",
  ],
  email: [
    "over {name}? he replies fast. seriously.",
    "{name} is one click from his inbox. fate?",
    "compose something — {name} guarantees a reply. (legally not binding.)",
    "the {name} link hums with inbox energy.",
  ],
  blog: [
    "«{name}» — good one, that. starts strong.",
    "«{name}». i've read it. twice. scroll on.",
    "that's «{name}». it earns the click.",
    "«{name}» — the vault purrs its approval.",
  ],
  graph: [
    "{name} — every node knows my name.",
    "{name} is where the constellation starts.",
    "the graph calls. {name} is lit.",
    "drag it, spin it, get lost in {name}. i'll wait.",
  ],
  contact: [
    "the form's right there — {name} says hello first.",
    "{name}: where conversations with sachin begin.",
    "he reads every message. {name} can prove it.",
    "three fields stand between you and writing to him.",
  ],
  demo: [
    "{name} — live and loading. click it.",
    "{name} runs in production. brave.",
    "the demo's up: {name}. it never sleeps.",
    "{name} deploys cleanly. i watched the build.",
  ],
};

export const encourageAbout = (kind: EncourageKind, name: string): string => {
  const clean = name.replace(/\s+/g, " ").trim();
  if (clean.length < 2) return encourageLine(kind);
  return freshPick(ENCOURAGE_ABOUT[kind]).replace("{name}", clip(clean, 46));
};

/* ------------------- note awareness (the vault) ------------------- */

/* she has "read" every note in the vault: when one opens she gives the
   overview, narrates section headings as they arrive, flags screenshots
   and boxed facts, and pushes toward the next part at the end */
export interface NoteStats {
  sections: number;
  shots: number;
  callouts: number;
  minutes: number;
  firstHeading: string;
}

const clip = (s: string, n: number): string =>
  s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;

export const noteOverviewLine = (s: NoteStats): string =>
  pick([
    `briefing: ${s.sections} sections, ${s.shots} screenshots, ~${s.minutes} min. verdict: worth it.`,
    `overview: "${clip(s.firstHeading, 38)}" leads, ${s.shots} hand-drawn arrows follow. read on, i'll narrate.`,
    `${s.minutes} min, ${s.sections} headings, ${s.callouts} boxed facts. this one's well-kept.`,
    `i've read this one. the screenshots have arrows for a reason — follow them.`,
    `${s.shots} screenshots doing the teaching. he trusts you to look. so do i.`,
    `map of the note: ${s.sections} sections, first stop "${clip(s.firstHeading, 34)}". ${s.minutes} minutes, no filler.`,
  ]);

const QUESTION_RE =
  /\?$/i;

export const noteHeadingLine = (heading: string, next?: string): string => {
  const h = clip(heading, 42);
  const question =
    QUESTION_RE.test(heading) ||
    /^(why|how|what|when|where|who|can|could|should|is|are|do|does)\b/i.test(
      heading,
    );
  if (question) {
    return pick([
      `"${h}" — good question. the answer is below.`,
      `he asked "${h}" so future-you wouldn't have to.`,
      `"${h}"? scroll on. he answers it properly.`,
    ]);
  }
  if (/^\d+[.)]/.test(heading)) {
    return pick([
      `"${h}" — part of a series. keep the streak alive.`,
      `numbered section: "${h}". he sequences things. i approve.`,
    ]);
  }
  if (next) {
    const n = clip(next, 36);
    return pick([
      `after "${h}": "${n}". no spoilers beyond that.`,
      `"${h}" now — then "${n}". keep going.`,
      `this section is "${h}". next up: "${n}".`,
    ]);
  }
  return pick([
    `"${h}" — the important bit. don't skim it.`,
    `entering "${h}". stay curious.`,
    `"${h}": where the note earns its keep.`,
  ]);
};

export const noteEndLine = (next?: string): string => {
  if (next) {
    const n = clip(next, 40);
    return pick([
      `you made it. next part: "${n}" — one click, zero excuses.`,
      `end of this note. the series continues with "${n}". i'll wait.`,
      `finished! "${n}" is waiting right below. the streak deserves it.`,
      `the cat approves this read. next up: "${n}".`,
    ]);
  }
  return pick([
    "you read to the bottom. he sees the analytics. (i am the analytics.)",
    "the end. 10/10 finish. related notes live below — pick one.",
    "done. stamp: approved by cat. the folder links below lead further.",
    "bottom of the page reached. the vault has 300+ more. no pressure.",
  ]);
};

export const noteShotLine = (): string =>
  pick([
    "screenshot — follow his arrows, they're the lesson.",
    "he draws arrows on these for a reason. look where they point.",
    "another screenshot. this vault teaches with pictures first.",
    "past this one? good. the diagrams do half the talking here.",
  ]);

export const noteCalloutLine = (): string =>
  pick([
    "boxed fact. he only boxes what matters — cats respect boxes.",
    "that callout is a keeper. highlight reel material.",
    "a box! facts inside. approved.",
    "callout = the note's version of bolding a treat.",
  ]);

/* /blog index: grounded vault facts — counts computed from the real
   posts list, so she always quotes true numbers */
export const vaultStatLine = (
  total: number,
  topFolder: string,
  topCount: number,
): string =>
  pick([
    `${total} notes in the vault. ${topFolder} alone holds ${topCount}. i've napped on most.`,
    `${total} notes — ask me anything. (answer will contain ${topFolder}: ${topCount} of them.)`,
    `the vault: ${total} notes, ${topCount} under ${topFolder}. ambitious.`,
    `i've read all ${total}. ${topFolder} is where he lives. opinion: correct folder.`,
    `${topFolder}: ${topCount} notes deep. the rest of the vault: also good. read around.`,
  ]);

const ACT_DEFS: ActDef[] = [
  { id: "yarn", weight: 11, line: (c) => pick(ACT_LINES.yarn) + (c.dark ? "" : "") },
  { id: "zoomies", weight: 8, line: () => pick(ACT_LINES.zoomies) },
  { id: "stare", weight: 9, line: () => pick(ACT_LINES.stare) },
  { id: "stretch", weight: 9, line: () => pick(ACT_LINES.stretch) },
  { id: "groom", weight: 8, line: () => pick(ACT_LINES.groom) },
  { id: "knock", weight: 7, line: () => pick(ACT_LINES.knock) },
  { id: "loaf", weight: 8, line: () => pick(ACT_LINES.loaf) },
  { id: "chirp", weight: 7, line: () => pick(ACT_LINES.chirp) },
  { id: "dance", weight: 8, line: () => pick(ACT_LINES.dance) },
  { id: "hide", weight: 6, line: () => pick(ACT_LINES.hide) },
  { id: "stats", weight: 5, line: (c) => statsLine(c) },
  { id: "prophecy", weight: 8, line: () => pick(PREDICTIONS).say },
  { id: "deep", weight: 8, line: () => pick(ACT_LINES.deep) },
  { id: "audit", weight: 5, line: () => pick(ACT_LINES.audit) },
  { id: "seat", weight: 6, line: () => pick(ACT_LINES.seat) },
  { id: "prey", weight: 9, line: () => pick(ACT_LINES.prey) },
  { id: "scratch", weight: 7, line: () => pick(ACT_LINES.scratch) },
  { id: "spin", weight: 6, line: () => pick(ACT_LINES.spin) },
  { id: "sneeze", weight: 5, line: () => pick(ACT_LINES.sneeze) },
  { id: "butterfly", weight: 9, line: () => pick(ACT_LINES.butterfly) },
  { id: "flop", weight: 6, line: () => pick(ACT_LINES.flop) },
  { id: "paw", weight: 8, line: () => pick(ACT_LINES.paw) },
  { id: "sunbeam", weight: 7, line: () => pick(ACT_LINES.sunbeam) },
  { id: "laser", weight: 8, line: () => pick(ACT_LINES.laser) },
  { id: "pounce", weight: 7, line: () => pick(ACT_LINES.pounce) },
  { id: "dig", weight: 6, line: () => pick(ACT_LINES.dig) },
  { id: "box", weight: 7, line: () => pick(ACT_LINES.box) },
  { id: "tailchase", weight: 6, line: () => pick(ACT_LINES.tailchase) },
  { id: "social", weight: 8, line: () => pick(ACT_LINES.social) },
  { id: "roll", weight: 7, line: () => pick(ACT_LINES.roll) },
  { id: "playbow", weight: 6, line: () => pick(ACT_LINES.playbow) },
  { id: "dust", weight: 6, line: () => pick(ACT_LINES.dust) },
  { id: "gift", weight: 7, line: () => pick(ACT_LINES.gift) },
];

export const actLine = (id: ActId, ctx: CatContext): string => {
  const def = ACT_DEFS.find((a) => a.id === id);
  const line = def ? def.line(ctx) : "meow.";
  remember(typeof line === "string" ? line : "…");
  return typeof line === "string" ? line : "…";
};

/** weighted pick, skipping recently used act ids */
export const pickAct = (recentIds: Set<ActId>): ActId => {
  const fresh = ACT_DEFS.filter((a) => !recentIds.has(a.id));
  const pool = fresh.length ? fresh : ACT_DEFS;
  const total = pool.reduce((n, a) => n + a.weight, 0);
  let roll = Math.random() * total;
  for (const a of pool) {
    roll -= a.weight;
    if (roll <= 0) return a.id;
  }
  return pool[pool.length - 1].id;
};

export const nextProphecy = () => pick(PREDICTIONS);

export { ACT_LINES, PREDICTIONS, TOPICS as TOPIC_POOL, templatePools as TEMPLATE_POOL_SENTINEL };
