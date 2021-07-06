const unirest = require('unirest');

module.exports = {
    keyword: 'waifu',
    title: 'Waifu',
    limit: 0,
    waitTime: 0,
    
    init: function() {
        // nothing to do here
    },
    
    get: async function() {
        let pageNumber = Math.floor(Math.random() * Math.floor(800));
        
        let request = unirest("GET", "https://api.redtube.com/?data=redtube.Stars.getStarDetailedList&output=json&page=" + pageNumber.toString());
        
        let obj = {};
        await new Promise((resolve, reject) => {
            request.end(function(res) {
                if (res.error) {
                    console.log(res.error);
                    return;
                }
                
                if (!res.body.stars) {
                    return;
                }
                
                let starNumber = Math.floor(Math.random() * Math.floor(res.body.stars.length));
                let star = res.body.stars[starNumber];
                
                obj = { id: star.star, name: star.star, imgPath: 'URL', img: star.star_thumb, type: module.exports.title };
                
                resolve();
            }); 
        });
        
        return obj;
    }
}