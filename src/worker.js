export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/views" || url.pathname.startsWith("/api/views/")) {
      const slug = url.pathname.replace("/api/views/", "");
      if (!slug) {
        return new Response(JSON.stringify({ error: "missing slug" }), { status: 400 });
      }
      if (slug.length > 200) {
        return new Response(JSON.stringify({ error: "slug too long" }), { status: 400 });
      }
      const key = `views:${slug}`;
      const current = parseInt(await env.BLOG_VIEWS.get(key) ?? "0", 10);
      const increment = url.searchParams.get("increment") === "1";
      const views = increment ? current + 1 : current;
      if (increment) {
        await env.BLOG_VIEWS.put(key, String(views));
      }
      return new Response(JSON.stringify({ views }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/leetcode") {
      try {
        const res = await fetch("https://leetcode.com/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `query{matchedUser(username:"b2mIkNz0h5"){submitStats{acSubmissionNum{difficulty count}}}}`,
          }),
        });
        const data = await res.json();
        const solved = data?.data?.matchedUser?.submitStats?.acSubmissionNum?.[0]?.count;
        if (typeof solved !== "number") throw new Error("bad response");
        return new Response(JSON.stringify({ solved }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch {
        return new Response(JSON.stringify({ error: "unavailable" }), {
          status: 502,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    return env.ASSETS?.fetch(request) ?? new Response(null, { status: 404 });
  },
};
