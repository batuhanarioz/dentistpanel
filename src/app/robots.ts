import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    const baseUrl = 'https://clinic.nextgency360.com'

    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: [
                '/api/',      // API rotalarını gizle
                '/[slug]/',   // Dashboard rotalarını arama motorlarından gizle
                '/admin/',    // Admin yönetici panellerini gizle
                '/platform/', // Platform yönetici panellerini gizle
                '/_next/',    // Next.js iç rotalarını gizle
            ],
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    }
}
