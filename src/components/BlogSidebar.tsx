import { useEffect } from "react";
import { Star } from "lucide-react";
import { Search } from "lucide-react";

const sidebarClasses = (isMobile: boolean) =>
  isMobile
    ? "fixed left-0 top-0 bottom-0 w-full sm:w-full bg-white dark:bg-[#0d1527] border-0"
    : "w-16 sm:w-20 bg-white dark:bg-[#0d1527] border-r border-zinc-200/80 dark:border-zinc-800/80 z-40 py-6 transition-transform transform duration-300 translate-x-full sm:translate-x-0";

const BlogSidebar = () => {
  const isMobile = window.innerWidth < 768;

  /* GSAP entrance animation */
  useEffect(() => {
    const spine = document.querySelector(".blog-sidebar-spine");
    if (!spine) return;
    const items = document.querySelectorAll(".blog-sidebar-item");
    if (!items.length) return;

    // @ts-ignore
    gsap.fromTo(
      items,
      { y: 20, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.6,
        ease: "power2.out",
        stagger: 0.08,
      }
    );
  }, [isMobile]);

  return (
    <aside
      className={sidebarClasses(isMobile)}
      aria-label="Blog sidebar"
    >
      <div className="flex flex-col items-center gap-4 mb-8">
        <h2 className="text-xs font-semibold text-white-50/60 uppercase tracking-wider">
          Blog
        </h2>
        <a
          href="https://github.com/SachinyadavAug20/My-Obsidian-notes"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-black-200 text-white-50 hover:bg-black-100 hover:text-foreground transition-colors text-sm font-medium"
        >
          <Star className="size-4" />
          <span>Star</span>
        </a>
      </div>

      {isMobile && (
        <div className="w-full mb-6 border-t border-zinc-200/20 pt-6">
          <h3 className="text-xs font-medium text-white-50/60 uppercase tracking-wider mb-2">
            Search
          </h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white-50/40" />
            <input
              type="text"
              placeholder="Search notes..."
              className="pl-10 pr-8 py-3.5 rounded-xl bg-black-200 border border-black-50 text-white-50 placeholder:text-white-50/30 focus:border-blue-500/50 transition-colors text-sm"
            />
          </div>
        </div>
      )}
    </aside>
  );
};

export default BlogSidebar;