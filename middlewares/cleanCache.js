const {clearHash} = require('../services/cache');

module.exports = async (req, res, next) => {
    await next(); //make the route handler perform all actions

    clearHash(req.user.id);
};