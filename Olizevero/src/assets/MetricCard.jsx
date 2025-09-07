import React from 'react';

const MetricCard = ({ icon: Icon, label, value, progress, change, color, isDarkMode }) => {
    const colorClasses = {
        red: { bg: 'from-red-400 to-red-600', text: 'text-red-600', progressBg: 'bg-red-100' },
        emerald: { bg: 'from-emerald-400 to-emerald-600', text: 'text-emerald-600', progressBg: 'bg-emerald-100' },
        amber: { bg: 'from-amber-400 to-orange-600', text: 'text-amber-600', progressBg: 'bg-amber-100' },
        blue: { bg: 'from-blue-400 to-blue-600', text: 'text-blue-600', progressBg: 'bg-blue-100' },
    };

    const selectedColor = colorClasses[color] || colorClasses.blue;

    return (
        <div className={`group ${isDarkMode ? 'bg-gray-800/80 border-gray-700/20 hover:bg-gray-800/90' : 'bg-white/80 border-white/20 hover:bg-white/90'} backdrop-blur-sm p-6 rounded-2xl shadow-lg border hover:shadow-xl hover:scale-105 transition-all duration-300`}>
            <div className="flex items-center gap-3 mb-4">
                <div className={`p-3 bg-gradient-to-br ${selectedColor.bg} rounded-xl`}>
                    <Icon className="text-white" size={20} />
                </div>
                <div>
                    <h3 className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wide`}>{label}</h3>
                    <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{value}</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <div className={`flex-1 h-2 ${selectedColor.progressBg} rounded-full overflow-hidden`}>
                    <div className={`h-full bg-gradient-to-r ${selectedColor.bg} rounded-full transition-all duration-1000`} style={{ width: `${progress}%` }}></div>
                </div>
                <span className={`text-sm ${selectedColor.text} font-medium`}>{change}</span>
            </div>
        </div>
    );
};

export default MetricCard;
