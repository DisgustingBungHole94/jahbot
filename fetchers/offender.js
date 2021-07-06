const unirest = require('unirest');

module.exports = {
    keyword: 'offender',
    title: 'Offender',
    limit: 5,
    waitTime: 1800000,
    
    init: function() {
        // nothing to do here
    },
    
    get: async function() {
        let dates = [ "today", "yesterday", "previous monday", "previous tuesday", "previous wednesday", "previous thursday", "previous friday", "previous saturday", "previous sunday" ];
        let date = dates[Math.floor(Math.random() * Math.floor(9))];

        let request = unirest("GET", "https://www.iowasexoffender.gov/api/search/results.json?updated=" + date);
        
        let obj = {};
        await new Promise((resolve, reject) => {
            request.end(function(res) {
                if (res.error) {
                    return;
                }

                const json = JSON.parse(res.body);
                if (!json.records) {
                    return;
                }

                let offenderNumber = 0;
                do {
                    offenderNumber = Math.floor(Math.random() * Math.floor(json.records.length));
                } while(!json.records[offenderNumber].photo);

                let offender = json.records[offenderNumber];
                let descriptionString = "Race: " + offender.race + "\nHeight: " + offender.height_inches + " inches \nWeight: " + offender.weight_pounds + " pounds\nAddress: " + offender.address + "\nChild Victims: " + offender.victim_minors + "\nAdult Victims: " + offender.victim_adults;

                obj = { id: offender.registrant, name: offender.display_name, imgPath: 'URL', img: offender.photo, additionalInfo: descriptionString, type: module.exports.title };
                
                resolve();
            });
        });
        
        return obj;
    }
}