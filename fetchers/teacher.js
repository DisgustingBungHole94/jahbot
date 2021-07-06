const fs = require('fs');

var teacherArray = [];

module.exports = {
    keyword: 'teacher',
    title: 'Teacher',
    limit: 1,
    waitTime: 3600000,
    
    init: function() {
        let rawFile = fs.readFileSync('./resources/marry_dbs/teachers/teachers.json');
        teacherArray = JSON.parse(rawFile);
    },
    
    get: function() {
        let teacherIndex = Math.floor(Math.random() * Math.floor(teacherArray.teachers.length));
        let teacher = teacherArray.teachers[teacherIndex];
        
        return { id: teacher.id, name: teacher.name, imgPath: './resources/marry_dbs/teachers/img/', img: teacher.img, type: module.exports.title };
    }
}