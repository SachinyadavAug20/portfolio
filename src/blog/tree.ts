import type { BlogPost } from "./types";

export function naturalCompare(a: string, b: string): number {
  const numA = a.match(/^\d+/)?.[0];
  const numB = b.match(/^\d+/)?.[0];
  if (numA !== undefined && numB !== undefined) {
    const diff = parseInt(numA) - parseInt(numB);
    if (diff !== 0) return diff;
  }
  return a.localeCompare(b);
}

export interface TreeNode {
  name: string;
  type: "folder" | "file";
  slug?: string;
  title?: string;
  children?: TreeNode[];
}

export function buildTree(posts: BlogPost[]): TreeNode {
  const root: TreeNode = { name: "root", type: "folder", children: [] };

  for (const post of posts) {
    const segments = post.dir ? post.dir.split("/").filter(Boolean) : [];
    let current = root;

    for (const segment of segments) {
      let child = current.children?.find(
        (c) => c.type === "folder" && c.name === segment,
      );
      if (!child) {
        child = { name: segment, type: "folder", children: [] };
        current.children = current.children || [];
        current.children.push(child);
      }
      current = child;
    }

    current.children = current.children || [];
    current.children.push({
      name: post.title,
      type: "file",
      slug: post.fullSlug,
      title: post.title,
    });
  }

  sortTree(root);
  return root;
}

function sortTree(node: TreeNode) {
  if (!node.children) return;
  node.children.sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return naturalCompare(a.name, b.name);
  });
  for (const child of node.children) {
    sortTree(child);
  }
}

export function getFolderAtPath(
  tree: TreeNode,
  path: string,
): TreeNode | undefined {
  if (!path) return tree;
  const segments = path.split("/").filter(Boolean);
  let current: TreeNode | undefined = tree;

  for (const seg of segments) {
    current = current?.children?.find(
      (c) => c.type === "folder" && c.name === seg,
    );
    if (!current) return undefined;
  }
  return current;
}
