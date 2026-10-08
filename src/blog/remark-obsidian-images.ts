import type { Root, Text, Image } from "mdast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import { OWNER, REPO, BRANCH } from "./config";

const IMG_RE = /!\[\[([^\]]+?)(?:\|(\d+))?\]\]/g;

function toWebpUrl(url: string): string {
  return url.replace(/\.(png|jpg|jpeg|gif|bmp|tiff?)$/i, ".webp");
}

function buildImageUrls(noteDir: string, filename: string): string[] {
  const encoded = encodeURI(filename);
  const base = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${noteDir}/`;
  const repoRoot = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/`;
  const basename = filename.split("/").pop() ?? filename;
  const urls = [
    `${base}attachements/${encoded}`,
    `${base}attachement/${encoded}`,
    `${base}attachments/${encoded}`,
    `${base}attachment/${encoded}`,
    `${base}${encoded}`,
    `${repoRoot}${encodeURI(basename)}`,
  ];
  return urls.flatMap((u) => [toWebpUrl(u), u]);
}

const remarkObsidianImages: (noteDir: string) => Plugin<[], Root> = (noteDir) => {
  return () => {
    return (tree) => {
      visit(tree, "text", (node, index, parent) => {
        const value = (node as Text).value;
        if (!IMG_RE.test(value)) return;
        IMG_RE.lastIndex = 0;

        const parts: Array<Text | Image> = [];
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = IMG_RE.exec(value)) !== null) {
          if (match.index > lastIndex) {
            parts.push({
              type: "text",
              value: value.slice(lastIndex, match.index),
            });
          }
          const filename = match[1];
          const width = match[2];
          const urls = buildImageUrls(noteDir, filename);

          const hProperties: Record<string, string> = { loading: "lazy" };
          if (width) hProperties.width = width;
          if (urls.length > 1) hProperties["data-urls"] = JSON.stringify(urls);

          parts.push({
            type: "image",
            url: urls[0],
            alt: "loading image...",
            // native mdast image + hProperties renders the same <img> as the
            // old raw-html node did — without forcing rehype-raw's parse5 pass
            data: { hProperties },
          });
          lastIndex = match.index + match[0].length;
        }

        if (lastIndex < value.length) {
          parts.push({ type: "text", value: value.slice(lastIndex) });
        }

        if (parts.length > 0 && index !== undefined && parent && "children" in parent) {
          (parent as { children: Array<Text | Image> }).children.splice(index, 1, ...parts);
        }
      });
    };
  };
};

export default remarkObsidianImages;
