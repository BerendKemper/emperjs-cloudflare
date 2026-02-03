export async function handleRequest(request: Request) {
  if (request.method === `GET`) {
    // fetch all art items from D1
    const res = await DB.prepare(`SELECT * FROM ArtItems`).all();
    return new Response(JSON.stringify(res.results), {
      headers: { "Content-Type": `application/json` },
    });
  }

  if (request.method === `POST`) {
    // authenticated request, save to D1 and upload image to R2
    // see r2.ts helper for upload logic
  }

  return new Response(`Method not allowed`, { status: 405 });
}