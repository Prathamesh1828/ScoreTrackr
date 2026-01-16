import React from 'react';
import { MatchState } from '../types';
import { getMatchAnalytics, getWinProbabilityColor, getRequiredRunRateColor } from '../analytics';

interface MatchAnalyticsCardProps {
    match: MatchState;
    className?: string;
}

const MatchAnalyticsCard: React.FC<MatchAnalyticsCardProps> = ({ match, className = '' }) => {
    const analytics = getMatchAnalytics(match);

    // Only show analytics during second innings when live
    const shouldShowAnalytics = match.currentInningIndex === 1 &&
        match.status === 'live' &&
        analytics.target !== null;

    if (!shouldShowAnalytics) return null;

    const winProbColor = getWinProbabilityColor(analytics.winProbability);
    const rrrColor = getRequiredRunRateColor(analytics.requiredRunRate, analytics.currentRunRate);

    return (
        <div className={`glass rounded-2xl p-4 border border-white/10 shadow-lg ${className}`}>
            <div className="grid grid-cols-2 gap-4">
                {/* Required Run Rate */}
                {analytics.requiredRunRate !== null && analytics.runsNeeded && analytics.runsNeeded > 0 && (
                    <div className="space-y-1">
                        <div className="text-gray-400 text-[10px] font-black uppercase tracking-widest">
                            Required Rate
                        </div>
                        <div className={`text-2xl md:text-3xl font-black tabular-nums ${rrrColor}`}>
                            {analytics.requiredRunRate.toFixed(2)}
                        </div>
                        <div className="text-gray-500 text-[9px] font-bold">
                            {analytics.runsNeeded} runs in {analytics.oversRemaining} ov
                        </div>
                    </div>
                )}

                {/* Target Achieved */}
                {analytics.runsNeeded !== null && analytics.runsNeeded <= 0 && (
                    <div className="space-y-1">
                        <div className="text-gray-400 text-[10px] font-black uppercase tracking-widest">
                            Required Rate
                        </div>
                        <div className="text-2xl md:text-3xl font-black text-green-500">
                            TARGET
                        </div>
                        <div className="text-gray-500 text-[9px] font-bold">
                            Achieved!
                        </div>
                    </div>
                )}

                {/* Win Probability */}
                {analytics.winProbability !== null && (
                    <div className="space-y-1">
                        <div className="text-gray-400 text-[10px] font-black uppercase tracking-widest">
                            Win Probability
                        </div>
                        <div className={`text-2xl md:text-3xl font-black tabular-nums ${winProbColor}`}>
                            {Math.round(analytics.winProbability)}%
                        </div>
                        <div className="text-gray-500 text-[9px] font-bold">
                            {analytics.wicketsRemaining} wickets left
                        </div>
                    </div>
                )}
            </div>

            {/* Current Run Rate (Small indicator) */}
            <div className="mt-3 pt-3 border-t border-white/5">
                <div className="flex items-center justify-between text-[10px]">
                    <span className="text-gray-500 font-bold uppercase tracking-widest">Current Rate</span>
                    <span className="text-gray-400 font-black tabular-nums">
                        {analytics.currentRunRate.toFixed(2)}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default MatchAnalyticsCard;
