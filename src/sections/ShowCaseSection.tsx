import { useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { projects, type Project } from "../lib/projects";
import { ProjectModal } from "../components/ProjectModal";
import TitleHeader from "../components/TitleHeader";
import { ExternalLink, ArrowUpRight, Sparkles, Images } from "lucide-react";
import { tap } from "../lib/haptics";

gsap.registerPlugin(ScrollTrigger);

const ShowCaseSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useGSAP(
    () => {
      if (reduced) return;

      const mobile = window.matchMedia("(max-width: 767px)").matches;
      const dur = mobile ? 0.3 : 0.4;

      const projectEls = document.querySelectorAll(".showcase-card");
      projectEls.forEach((el, i) => {
        gsap.fromTo(
          el,
          {
            y: mobile ? 28 : 50,
            opacity: 0,
          },
          {
            y: 0,
            opacity: 1,
            duration: dur,
            delay: Math.min(0.08 * (i + 1), 0.3),
            ease: "power2.out",
            clearProps: "transform,opacity",
            scrollTrigger: {
              trigger: el,
              start: "top bottom-=80",
            },
          },
        );
      });
    },
    { scope: sectionRef, dependencies: [reduced], revertOnUpdate: true },
  );

  const openProject = (project: Project) => {
    tap(12);
    setSelectedProject(project);
  };

  const leadProject = projects[0];
  const otherProjects = projects.slice(1);

  return (
    <section ref={sectionRef} id="work" className="w-full section-padding">
      <div className="w-full h-full md:px-10">
        <TitleHeader title="Featured Projects" sub="Selected systems & architecture" />

        <div className="mt-8 space-y-8">
          {/* 1. Flagship Lead Project */}
          {leadProject && (
            <div
              onClick={() => openProject(leadProject)}
              className="showcase-card group relative rounded-3xl border border-black-50 bg-black-100/90 overflow-hidden cursor-pointer transition-all duration-300 hover:border-blue-500/60 hover:-translate-y-1 hover:shadow-[0_20px_50px_-15px_rgba(59,130,246,0.25)]"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                {/* Media Preview */}
                <div className="lg:col-span-7 relative aspect-[16/10] sm:aspect-[16/9] lg:aspect-auto overflow-hidden bg-black/40">
                  <img
                    src={leadProject.image}
                    alt={leadProject.title}
                    width={1920}
                    height={1080}
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent lg:hidden" />

                  {/* Multi-image indicator badge */}
                  <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 rounded-full border border-black-50 bg-black-100/95 px-3 py-1 font-mono text-xs text-white-50/90 shadow-md backdrop-blur-sm">
                    <Images className="size-3.5 text-blue-400" />
                    <span>{leadProject.images.length} Screenshots & Demo</span>
                  </div>
                </div>

                {/* Info Column */}
                <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-md border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-xs font-mono text-blue-400">
                        <Sparkles className="size-3" />
                        {leadProject.category}
                      </span>
                      <span className="text-xs font-mono text-white-50/50">
                        {leadProject.date}
                      </span>
                    </div>

                    <h3 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight group-hover:text-blue-400 transition-colors">
                      {leadProject.title}
                    </h3>
                    <p className="text-sm sm:text-base text-white-50/80 leading-relaxed">
                      {leadProject.blurb}
                    </p>

                    {/* Tech pills */}
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {leadProject.techStack.slice(0, 6).map((tech) => (
                        <span
                          key={tech}
                          className="rounded-md border border-black-50 bg-black-200 px-2 py-0.5 font-mono text-xs text-white-50/70"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-black-50/80">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openProject(leadProject);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <span>Explore details & gallery</span>
                      <ArrowUpRight className="size-4" />
                    </button>

                    <div className="flex items-center gap-2">
                      {leadProject.url && (
                        <a
                          href={leadProject.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => {
                            e.stopPropagation();
                            tap(8);
                          }}
                          className="size-8 rounded-lg border border-black-50 bg-black-200 flex items-center justify-center text-white-50 hover:text-white hover:border-emerald-500/60 transition-colors"
                          title="Live Demo"
                        >
                          <ExternalLink className="size-3.5" />
                        </a>
                      )}
                      <a
                        href={leadProject.github}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => {
                          e.stopPropagation();
                          tap(8);
                        }}
                        className="size-8 rounded-lg border border-black-50 bg-black-200 flex items-center justify-center text-white-50 hover:text-white hover:border-zinc-500 transition-colors"
                        title="GitHub Repository"
                      >
                        <img
                          src="/images/github.png"
                          alt=""
                          className="hidden dark:block size-3.5"
                        />
                        <img
                          src="/images/github-light.png"
                          alt=""
                          className="dark:hidden size-3.5"
                        />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. Grid of other Key Projects */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {otherProjects.map((project) => (
              <div
                key={project.id}
                onClick={() => openProject(project)}
                className="showcase-card group relative rounded-3xl border border-black-50 bg-black-100/90 overflow-hidden cursor-pointer transition-all duration-300 hover:border-blue-500/50 hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between"
              >
                <div>
                  {/* Image Container */}
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-black/40">
                    <img
                      src={project.image}
                      alt={project.title}
                      width={1280}
                      height={720}
                      className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                      decoding="async"
                    />

                    {/* Screenshot count badge */}
                    <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full border border-black-50 bg-black-100/90 px-2.5 py-0.5 font-mono text-[11px] text-white-50/90 shadow backdrop-blur-sm">
                      <Images className="size-3 text-blue-400" />
                      <span>{project.images.length} screenshots</span>
                    </div>
                  </div>

                  {/* Project Content */}
                  <div className="p-5 sm:p-6 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-mono text-white-50/60">
                      <span className="text-blue-400">{project.category}</span>
                      <span>{project.date}</span>
                    </div>

                    <h4 className="text-xl font-bold text-foreground group-hover:text-blue-400 transition-colors">
                      {project.title}
                    </h4>

                    <p className="text-xs sm:text-sm text-white-50/75 line-clamp-2 leading-relaxed">
                      {project.blurb}
                    </p>

                    <div className="flex flex-wrap gap-1 pt-1">
                      {project.techStack.slice(0, 4).map((tech) => (
                        <span
                          key={tech}
                          className="rounded border border-black-50 bg-black-200 px-1.5 py-0.5 font-mono text-[10px] text-white-50/70"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="px-5 sm:px-6 pb-5 pt-3 border-t border-black-50/60 flex items-center justify-between">
                  <span className="text-xs font-mono font-medium text-white-50/80 group-hover:text-blue-400 transition-colors inline-flex items-center gap-1">
                    <span>View Details & Gallery</span>
                    <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>

                  <div className="flex items-center gap-2">
                    {project.url && (
                      <a
                        href={project.url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => {
                          e.stopPropagation();
                          tap(8);
                        }}
                        className="size-7 rounded-lg border border-black-50 bg-black-200 flex items-center justify-center text-white-50 hover:text-white hover:border-emerald-500/60 transition-colors"
                        title="Live Demo"
                      >
                        <ExternalLink className="size-3" />
                      </a>
                    )}
                    <a
                      href={project.github}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => {
                        e.stopPropagation();
                        tap(8);
                      }}
                      className="size-7 rounded-lg border border-black-50 bg-black-200 flex items-center justify-center text-white-50 hover:text-white hover:border-zinc-500 transition-colors"
                      title="GitHub Repository"
                    >
                      <img
                        src="/images/github.png"
                        alt=""
                        className="hidden dark:block size-3"
                      />
                      <img
                        src="/images/github-light.png"
                        alt=""
                        className="dark:hidden size-3"
                      />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Project Modal with Gallery & Full Architectural Breakdown */}
      <ProjectModal
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
      />
    </section>
  );
};

export default ShowCaseSection;

