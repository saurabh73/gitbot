const ncp = require('ncp').ncp;
const slack = require('slack');
const request = require('request');
const unzip = require('unzip');

module.exports = {
    getFileInfo: (fileId, botToken) =>{
        return slack.files.info({token:botToken, file:fileId});
    },
    downloadFile : (file, botToken, slackDir) => {
        return new Promise((resolve) => {
            request({
                url: file.url_download,
                headers: {
                    'Authorization': 'Bearer ' + botToken
                }
            }).pipe(unzip.Extract({ path: slackDir })).on('close', () => {
                resolve(file);
            });
        })
    },

    moveSlackFiles: (sourceDir, targetDir) => {
        return new Promise((resolve) => {
            ncp(sourceDir, targetDir, function (err) {
                if (err) { throw err; }
                resolve()
            });
        });
    }
};