export function GET() {
  return new Response(
    ['User-agent: *', 'Allow: /', `Sitemap: ${import.meta.env.SITE}/sitemap.xml`].join('\n'),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
  );
}