export const SYSTEM_MESSAGES = {
    INNINGS_BREAK_START: (teamName: string, runs: number, wickets: number) =>
        `🏏 End of innings! ${teamName}: ${runs}/${wickets}`,

    TARGET_SET: (target: number, overs: number) =>
        `🎯 Target: ${target} runs in ${overs} overs`,

    NEXT_INNINGS_SOON: () =>
        `⏳ Second innings coming up...`,

    INNINGS_BREAK_END: () =>
        `🚀 Second innings begins!`
};
