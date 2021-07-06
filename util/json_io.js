const fs = require('fs');

module.exports = {
    readFile: function(path) {
        let data = fs.readFileSync(path, {encoding: 'utf8'});
        
        return JSON.parse(data);
    },
    
    writeFile: function(path, data) {
        let parsedJson = JSON.stringify(data);

        fs.writeFileSync(path, parsedJson, {encoding: 'utf8', flag: 'w'});
    }
}