"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function RecallRedirectPage() {
    const router = useRouter();
    const params = useParams();
    const slug = params?.slug as string;

    useEffect(() => {
        if (slug) {
            router.replace(`/${slug}/communication`);
        }
    }, [slug, router]);

    return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
        </div>
    );
}
