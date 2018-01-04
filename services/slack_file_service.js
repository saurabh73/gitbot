const ncp = require('ncp').ncp;
const slack = require('slack');
const request = require('request');
const unzip = require('unzip');

module.exports = {
    getFileInfo: (fileId, botToken) =>{
        return slack.files.info({token:botToken, file:fileId});
    },
    downloadFile : (file, botToken, slackDir) => {
        return new Promise((resolve, reject) => {
            if (file.filetype === "zip") {
                console.log(`file type zip`);
                try {
                    request({
                        url: file.url_private_download,
                        headers: {
                            'Authorization': 'Bearer ' + botToken
                        }
                    }).pipe(unzip.Extract({ path: slackDir })).on('close', () => {
                        console.log(`file download success ${slackDir}`);
                        resolve(file);
                    });
                } catch (err) {
                    console.log(`file download failure ${slackDir}`);
                    reject(err);
                }

            } else {
                console.log(`file type not zip`);
                reject('invalid file type')
            }
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