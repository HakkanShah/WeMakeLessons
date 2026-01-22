"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { playSound } from "@/lib/sounds";

export default function NavigationSounds({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const previousPathname = useRef(pathname);
    const isFirstRender = useRef(true);

    useEffect(() => {
        // Skip sound on first render (initial page load)
        if (isFirstRender.current) {
            isFirstRender.current = false;
            previousPathname.current = pathname;
            return;
        }

        // Play sound only when pathname actually changes
        if (previousPathname.current !== pathname) {
            playSound("navigate");
            previousPathname.current = pathname;
        }
    }, [pathname]);

    return <>{children}</>;
}
