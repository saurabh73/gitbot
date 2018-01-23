const lib = require('lib')({token: process.env.STDLIB_TOKEN});
const botService = require('../../../services/main');

/**
 *
 * @param {string} channel
 * @param {string} user
 * @param {object} event
 * @param {string} botToken
 * @returns {object}
 */
module.exports = (channel, user = '', event = {}, botToken = null, callback) => {

    // Step 1, discard if no mention for git-bot in comment or not new upload.

    const file = event.file;
    const firstComment = file.initial_comment || {comment: ''};
    if (event.upload && firstComment.comment.indexOf("<@U80T78ACB>") >= 0) {
        // reply with error with file type not zip
        if (file.filetype !== "zip") {
            callback(null, {
                text: `invalid file type ${file.filetype} received. Only .zip file format supported`
            });
        } else {
            let obj = {
                command: 'commit',
                file: {
                    id: file.id,
                    name: file.name,
                    type: file.filetype,
                    url: file.url_private,
                    url_download: file.url_private_download,
                    comment: firstComment.comment
                }
            };
            let menuMsg = "Please select repository you want to commit file contents?";
            botService.prepareRepoAction(obj, menuMsg).then((menu) => {
                callback(null, menu);
            }).catch((err) => {
                callback(err, null);
            });
        }

    } else {
        // exit silently
        callback(null, {});
    }

};