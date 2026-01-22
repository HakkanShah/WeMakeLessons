"use client";

import { useVoice } from "@/context/VoiceContext";

export function useTextToSpeech() {
    return useVoice();
}
