export default {
  async fetch(request, env) {
    const url = new URL(request.url);

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
        const solved = data?.data?.matchedUser?.submitStats?.acSubmissionNum?.[0]?.count ?? 150;
        return new Response(JSON.stringify({ solved }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch {
        return new Response(JSON.stringify({ solved: 150 }), {
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    return env.ASSETS.fetch(request);
  },
};
