const lib = require('lib')({token: process.env.STDLIB_TOKEN});


module.exports = (context, callback) => {

    callback(null, {
        text: `File Recieved ${JSON.stringify(context)}`
    });
    
};
    