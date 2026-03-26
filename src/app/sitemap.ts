import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://clinic.nextgency360.com'

    return [
        { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
        { url: `${baseUrl}/register`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
        { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/iletisim`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
        { url: `${baseUrl}/satis-politikasi`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.4 },
        { url: `${baseUrl}/teslimat-ve-kullanim`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.4 },
        { url: `${baseUrl}/iptal-ve-iade`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.4 },
        { url: `${baseUrl}/mesafeli-satis-sozlesmesi`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.4 },
    ]
}
