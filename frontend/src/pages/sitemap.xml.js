function generateSiteMap() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://drxconsult.netlify.app'
  
  // Static pages
  const staticPages = [
    '',
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/privacy-policy',
    '/terms-and-conditions',
    '/faq',
    '/customer-service',
  ]

  // Dynamic pages (you can fetch these from your API)
  const dynamicPages = [
    // Add dynamic routes here if needed
    // '/book/pharmacist-1',
    // '/book/pharmacist-2',
  ]

  const allPages = [...staticPages, ...dynamicPages]

  return `<?xml version="1.0" encoding="UTF-8"?>
   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
     ${allPages
       .map((page) => {
         return `
       <url>
           <loc>${baseUrl}${page}</loc>
           <lastmod>${new Date().toISOString()}</lastmod>
           <changefreq>${page === '' ? 'daily' : 'weekly'}</changefreq>
           <priority>${page === '' ? '1.0' : '0.8'}</priority>
       </url>
     `
       })
       .join('')}
   </urlset>
 `
}

function SiteMap() {
  // getServerSideProps will do the heavy lifting
}

export async function getServerSideProps({ res }) {
  // We make an API call to gather the URLs for our site
  const sitemap = generateSiteMap()

  res.setHeader('Content-Type', 'text/xml')
  // we send the XML to the browser
  res.write(sitemap)
  res.end()

  return {
    props: {},
  }
}

export default SiteMap
