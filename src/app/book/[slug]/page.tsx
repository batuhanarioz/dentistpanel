"use client";
// /book/[slug] artık kullanılmıyor — /randevu/[slug] kullan
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function BookRedirect() {
    const { slug } = useParams() as { slug: string };
    const router = useRouter();
    useEffect(() => {
        router.replace(`/randevu/${slug}`);
    }, [slug, router]);
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
    );
}
