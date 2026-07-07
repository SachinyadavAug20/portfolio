import type { Root } from "mdast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import { OWNER, REPO, BRANCH } from "./config";

const IMG_RE = /!\[\[([^\]]+?)(?:\|(\d+))?\]\]/g;

function buildImageUrls(noteDir: string, filename: string): string[] {
  const encoded = encodeURI(filename);
  const base = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${noteDir}/`;
  const repoRoot = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/`;
  const basename = filename.split("/").pop() ?? filename;
  return [
    `${base}attachements/${encoded}`,
    `${base}attachement/${encoded}`,
    `${base}attachments/${encoded}`,
    `${base}attachment/${encoded}`,
    `${base}${encoded}`,
    `${repoRoot}${encodeURI(basename)}`,
  ];
}

const remarkObsidianImages: (noteDir: string) => Plugin<[], Root> = (noteDir) => {
  return () => {
    return (tree) => {
      visit(tree, "text", (node: { value: string }, index: number | undefined, parent: any) => {
        if (!IMG_RE.test(node.value)) return;
        IMG_RE.lastIndex = 0;

        const parts: Array<{ type: string; value?: string }> = [];
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = IMG_RE.exec(node.value)) !== null) {
          if (match.index > lastIndex) {
            parts.push({
              type: "text",
              value: node.value.slice(lastIndex, match.index),
            });
          }
          const filename = match[1];
          const width = match[2];
          const urls = buildImageUrls(noteDir, filename);

          const attrs = [
            `src="${urls[0]}"`,
            'alt="loading image..."',
            'loading="lazy"',
          ];
          if (width) attrs.push(`width="${width}"`);
          if (urls.length > 1) {
            attrs.push(`data-urls='${JSON.stringify(urls)}'`);
          }

          parts.push({
            type: "html",
            value: `<img ${attrs.join(" ")} />`,
          });
          lastIndex = match.index + match[0].length;
        }

        if (lastIndex < node.value.length) {
          parts.push({ type: "text", value: node.value.slice(lastIndex) });
        }

        if (parts.length > 0 && index !== undefined && parent) {
          parent.children.splice(index, 1, ...parts);
        }
      });
    };
  };
};

export default remarkObsidianImages;
