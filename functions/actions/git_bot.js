const lib = require('lib')({token: process.env.STDLIB_TOKEN});
const botService = require('../../services/main');
const rimraf = require('rimraf');

/**
 * test.js
 *
 *   Basic example action handler. Called in response to an input from an
 *     interactive message.
 *   All Actions in response to interactive messages use this template, simply
 *   create additional files with different names to add actions.
 *
 *   See https://api.slack.com/docs/message-buttons for more details.
 *
 * @param {string} user The user id of the user that invoked this command (name is usable as well)
 * @param {string} channel The channel id the command was executed in (name is usable as well)
 * @param {object} action The full Slack action object
 * @param {string} botToken The bot token for the Slack bot you have activated
 * @returns {object}
 */
module.exports = (user, channel, action = {}, botToken = null, callback) => {

    // filter on basis of callback_id
    if (action.callback_id === "repo_selection") {
        let obj = JSON.parse(action.actions[0].selected_options[0].value);
        if (obj.command === 'info') {
            botService.processBotInfo(callback, obj);
        } else {
            botService.prepareBranchAction(obj).then((menu) => {
                if (menu === null) {
                    obj.repo.branch = "master";
                    processCommand(callback, obj, botToken);
                } else {
                    callback(null, menu);
                }

            }).catch((err) => {
                callback(err, null);
            });
        }
    } else {
        let obj = JSON.parse(action.actions[0].selected_options[0].value);
        processCommand(callback, obj, botToken);
    }

};

function processCommand(callback, obj, botToken) {

    botService.prepareGitWorkspace().then((workspace) => {
        let exitCallback = (err, result) => {
            /** Do cleanup here */
            rimraf(workspace.workDir, (err) => {
                if (err) {
                    console.error(err)
                }
                callback(err, result);
            });
        };
        // logic
        if (obj.command === 'commit') {
            botService.processBotCommit(exitCallback, workspace, obj, botToken);
        } else if (obj.command === 'fetch') {
            botService.processBotFetch(exitCallback, workspace, obj, botToken);
        }

    }).catch((err) => {
        callback(err, null);
    });

}
