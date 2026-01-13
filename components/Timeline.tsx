import React, { useMemo } from 'react';
import { BallEvent } from '../types';

interface TimelineProps {
    events: BallEvent[];
}

const Timeline: React.FC<TimelineProps> = ({ events }) => {

    const oversHistory = useMemo(() => {
        const groups: { [key: number]: BallEvent[] } = {};
        events.forEach(e => {
            if (!groups[e.over]) groups[e.over] = [];
            groups[e.over].push(e);
        });
        return Object.entries(groups).sort((a, b) => Number(b[0]) - Number(a[0]));
    }, [events]);

    const getBallDisplay = (e: BallEvent) => {
        if (e.isWicket) return 'W';
        if (e.type === 'wide') return `${e.runs > 0 ? e.runs + 1 : ''}wd`;
        if (e.type === 'noball') return `${e.runs > 0 ? e.runs + 1 : ''}nb`;
        if (e.type === 'bye') return `${e.runs}b`;
        if (e.type === 'legbye') return `${e.runs}lb`;
        return e.runs.toString();
    };

    const getBallColor = (e: BallEvent) => {
        if (e.isWicket) return 'bg-red-600 border-red-400 text-white shadow-[0_0_10px_rgba(220,38,38,0.5)]';
        if (e.runs === 6 && e.type === 'legal') return 'bg-purple-600 border-purple-400 text-white shadow-[0_0_10px_rgba(147,51,234,0.5)]';
        if (e.runs === 4 && e.type === 'legal') return 'bg-[#1DB954] border-[#A3FF12] text-black shadow-[0_0_10px_rgba(29,185,84,0.5)]';
        if (e.type !== 'legal') return 'bg-gray-800 border-gray-600 text-[#A3FF12]';
        return 'bg-white/10 border-white/5 text-white';
    };

    if (events.length === 0) {
        return (
            <div className="text-center py-10 text-gray-500 font-bold uppercase tracking-widest text-xs">
                No balls bowled yet
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-[#1e1e1e] rounded-3xl p-6 border border-white/5 shadow-2xl">
                <div className="flex items-center gap-3 mb-8">
                    <div className="h-8 w-1.5 bg-[#A3FF12] rounded-full shadow-[0_0_10px_rgba(163,255,18,0.5)]"></div>
                    <h3 className="text-[#A3FF12] font-black text-2xl italic tracking-tighter uppercase">Ball History</h3>
                </div>
                <div className="space-y-4">
                    {oversHistory.map(([overNum, overEvents]) => (
                        <div key={overNum} className="flex flex-col gap-4 p-5 bg-white/5 rounded-2xl border border-white/5 hover:border-[#1DB954]/20 transition-all group">
                            <div className="flex justify-between items-center">
                                <span className="text-lg font-black text-white italic group-hover:text-[#A3FF12] transition-colors">OVER {Number(overNum) + 1}</span>
                                <span className="text-[10px] font-black text-[#1DB954] uppercase tracking-widest italic">
                                    {overEvents[0]?.bowlerId || 'Unknown'} SPELL
                                </span>
                            </div>
                            <div className="flex gap-2 items-center overflow-x-auto pb-1 scrollbar-hide">
                                {overEvents.map(e => (
                                    <div key={e.id} className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs border relative transition-transform hover:scale-110 ${getBallColor(e)}`}>
                                        {getBallDisplay(e)}
                                        {e.isFreeHit && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-purple-600 rounded-full border border-white/20 animate-pulse"></div>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Timeline;
