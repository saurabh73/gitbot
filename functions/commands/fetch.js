const lib = require('lib')({token: process.env.STDLIB_TOKEN});
const botService = require('../../services/main');
/**
 * /fetch
 *
 *   Fetch command to fetch and upload zip version of repository.
 *
 *   See https://api.slack.com/slash-commands for more details.
 *
 * @param {string} user The user id of the user that invoked this command (name is usable as well)
 * @param {string} channel The channel id the command was executed in (name is usable as well)
 * @param {string} text The text contents of the command
 * @param {object} command The full Slack command object
 * @param {string} botToken The bot token for the Slack bot you have activated
 * @returns {object}
 */
module.exports = (user, channel, text = '', command = {}, botToken = null, callback) => {

    let commandTxt = command.command.replace('/','');
    let obj = {
        channel: channel,
        command:commandTxt,
        user: user
    };
    let msg= "Please select repository you want to fetch?";
    botService.prepareRepoAction(obj, msg).then((menu) => {
        callback(null, menu);
    }).catch((err) => {
        callback(err, null);
    });


};