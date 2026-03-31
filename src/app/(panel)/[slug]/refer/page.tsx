"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function ReferRedirect() {
    const router = useRouter();
    const params = useParams<{ slug: string }>();

    useEffect(() => {
        router.replace(`/${params.slug}/admin/subscription`);
    }, [router, params.slug]);

    return null;
}
