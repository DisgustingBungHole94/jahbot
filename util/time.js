module.exports = {
    formatTime: function(ms) {
        let h = Math.floor(ms / 3600000);
        ms -= h * 3600000;
        let m = Math.floor(ms / 60000);
        ms -= m * 60000;
        let s = Math.round(ms / 1000);
    
        var obj = {
            hours: h,
            minutes: m,
            seconds: s
        };
        
        return obj;
    },
    
    formatTimeDays: function (ms) {
        let d = Math.floor(ms / 86400000);
        ms -= d * 86400000;
        
        let fTime = module.exports.formatTime(ms);
        
        var obj = {
            days: d,
            hours: fTime.hours,
            minutes: fTime.minutes,
            seconds: fTime.seconds
        };
        
        return obj;
    }
}