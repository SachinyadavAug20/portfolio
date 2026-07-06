import type { Root, Text } from "mdast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

const IMG_RE = /!\[\[([^\]]+?)(?:\|(\d+))?\]\]/g;

const remarkObsidianImages: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, "text", (node: Text, index: number | undefined, parent: any) => {
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
        const imgPath = `/content/blog/java/attachments/${filename}`;

        parts.push({
          type: "html",
          value: width
            ? `<img src="${imgPath}" width="${width}" alt="${filename}" />`
            : `<img src="${imgPath}" alt="${filename}" />`,
        });
        lastIndex = match.index + match[0].length;
      }

      if (lastIndex < node.value.length) {
        parts.push({ type: "text", value: node.value.slice(lastIndex) });
      }

      if (parts.length > 0 && index !== undefined) {
        parent.children.splice(index, 1, ...parts);
      }
    });
  };
};

export default remarkObsidianImages;
