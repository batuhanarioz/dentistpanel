import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
    // Alan adı henüz netleşmediği için buraya geçici bir değer ekliyoruz.
    const baseUrl = 'https://clinic.nextgency360.com'

    return [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 1,
        },
        {
            url: `${baseUrl}/login`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/register`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.8,
        },
    ]
}
