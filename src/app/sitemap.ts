import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://clinic.nextgency360.com'

    return [
        { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
        { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    ]
}
