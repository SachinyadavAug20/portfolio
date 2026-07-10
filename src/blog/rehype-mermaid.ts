import { visit } from "unist-util-visit";
import type { Root, Element } from "hast";

export function rehypeMermaid() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element, index: number | undefined, parent: Root | Element | undefined) => {
      if (node.tagName !== "pre") return;

      const code = node.children[0] as Element | undefined;
      if (code?.tagName !== "code") return;

      const classList = code.properties?.className;
      if (!Array.isArray(classList) || !classList.includes("language-mermaid")) return;

      const text = (code.children[0] as { value?: string })?.value ?? "";

      const replacement: Element = {
        type: "element",
        tagName: "mermaid-diagram",
        properties: {},
        children: [{ type: "text", value: text }],
      };

      if (parent && index !== undefined) {
        parent.children[index] = replacement;
      }
    });
  };
}
