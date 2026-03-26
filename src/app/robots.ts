import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    const baseUrl = 'https://clinic.nextgency360.com'

    return {
        rules: {
            userAgent: '*',
            allow: ['/$', '/login$'],
            disallow: '/',
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    }
}
