function generateSiteMap() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://drxconsult.in' || 'https://drxconsult.com'
  const now = new Date().toISOString()

  const pages = [
    { path: '',                    changefreq: 'daily',   priority: '1.0' },
    { path: '/subscription-plans', changefreq: 'weekly',  priority: '0.9' },
    { path: '/doctors',            changefreq: 'daily',   priority: '0.9' },
    { path: '/pharmacists',        changefreq: 'daily',   priority: '0.9' },
    { path: '/nutritionists',      changefreq: 'daily',   priority: '0.9' },
    { path: '/locate-hospital',    changefreq: 'weekly',  priority: '0.8' },
    { path: '/health-trackers',    changefreq: 'weekly',  priority: '0.8' },
    { path: '/faq',                changefreq: 'monthly', priority: '0.7' },
    { path: '/customer-service',   changefreq: 'monthly', priority: '0.7' },
    { path: '/login',              changefreq: 'monthly', priority: '0.5' },
    { path: '/signup',             changefreq: 'monthly', priority: '0.5' },
    { path: '/privacy-policy',     changefreq: 'yearly',  priority: '0.4' },
    { path: '/terms-and-conditions', changefreq: 'yearly', priority: '0.4' },
    { path: '/disclaimer',         changefreq: 'yearly',  priority: '0.4' },
    { path: '/refund-policy',      changefreq: 'yearly',  priority: '0.4' },
  ]

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(({ path, changefreq, priority }) => `  <url>
    <loc>${baseUrl}${path}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`).join('\n')}
</urlset>`
}

function SiteMap() {}

export async function getServerSideProps({ res }) {
  const sitemap = generateSiteMap()
  res.setHeader('Content-Type', 'text/xml')
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate')
  res.write(sitemap)
  res.end()
  return { props: {} }
}

export default SiteMap
