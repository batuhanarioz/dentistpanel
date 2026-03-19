import { QueryClient, isServer } from "@tanstack/react-query";

function makeQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                // SSR hydration için 0'dan büyük olmalı.
                // 5 dakika: doktorlar, tedavi tipleri gibi nadiren değişen data için yeterli.
                // Randevu/ödeme gibi sık değişen sorgular kendi staleTime'larını override eder.
                staleTime: 5 * 60 * 1000,
                // Unused cache 10 dakika bellekte kalsın (tab değiştirince yeniden fetch olmasın)
                gcTime: 10 * 60 * 1000,
                // Network hatalarında 1 kez retry yeterli (default 3 = 3x yavaş UX)
                retry: 1,
            },
        },
    });
}

let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient() {
    if (isServer) {
        // Server: always make a new query client
        return makeQueryClient();
    } else {
        // Browser: make a new query client if we don't already have one
        // This is very important, so we don't re-make a new client if React
        // suspends during hydration, or on subsequent renders.
        if (!browserQueryClient) browserQueryClient = makeQueryClient();
        return browserQueryClient;
    }
}
