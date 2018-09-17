const mongoose = require('mongoose');
const redis = require("redis");
const util = require('util');
const redisUrl = 'redis://127.0.0.1:6379';
const client = redis.createClient(redis);
client.hget = util.promisify(client.hget);

const exec  = mongoose.Query.prototype.exec;

//Adding cache function
//No arrow function it will mess with the value 'this'
mongoose.Query.prototype.cache = function(options = {}){
    this.useCache = true;
    this.hashKey = JSON.stringify(options.key || '');
    return this;
}
mongoose.Query.prototype.exec = async function() {
    if(!this.useCache){
        console.log(exec.apply(this, arguments));
        return exec.apply(this, arguments);
    }
    const key = JSON.stringify(
        Object.assign({}, this.getQuery, {
            collection: this.mongooseCollection.name
        })
    );
    //See if we have a value for 'key' in redis
    const cacheValue = await client.hget(this.hashKey, key); // pulling info out of nested hash
    //If we do return that
    if(cacheValue){
        const doc = JSON.parse(cacheValue);
        console.log(doc);
        return Array.isArray(doc) 
        ? doc.map(d => new this.model(d))
        : new this.model(doc);
    }
    //otherwise issue the query and store the result in redis
    const result = await exec.apply(this, arguments);
    client.hset(this.hashKey, key, JSON.stringify(result));
    console.log(result);
    return result;
}

module.exports = {
    clearHash(hashKey){
        client.del(JSON.stringify(hashKey));
    }
};